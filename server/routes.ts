// server/routes.ts - النسخة المُصححة

import { Express, Request, Response } from "express";
import { storage } from "./storage.ts";

// ✅ تغيير التوقيع ليتطابق مع index.ts
export function registerRoutes(httpServer: any, app: Express) {
  // ❌ لا تُنشئ httpServer هنا - فهو مُمرر من index.ts
  // const httpServer = require("http").createServer(app); // احذف هذا

  // ============================================
  // Ledger Entries Route
  // ============================================

  app.get(
    "/api/ledger-entries/:accountId",
    async (req: Request, res: Response) => {
      try {
        const accountId = req.params.accountId;
        const entries = await storage.getLedgerEntries(
          accountId,
          req.query.from as string,
          req.query.to as string,
        );
        res.json(entries);
      } catch (err: any) {
        res.status(500).json({
          message: err?.message ?? "خطأ في الخادم",
        });
      }
    },
  );

  // Trial Balance Route
  app.get("/api/trial-balance", async (req, res) => {
    try {
      const data = await storage.getTrialBalance(
        req.query.from as string,
        req.query.to as string,
      );
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  // ── Payroll UI routes ──────────────────────────────────────────────────────

  app.get("/api/payroll/ui/employees", async (req, res) => {
    try {
      const branchId = req.query.branchId
        ? Number(req.query.branchId)
        : undefined;
      const data = await storage.getPayrollEmployees(branchId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.get("/api/payroll/ui/movements", async (req, res) => {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const branchId = req.query.branchId
        ? Number(req.query.branchId)
        : undefined;
      if (!month || !year)
        return res.status(400).json({ message: "month و year مطلوبان" });
      const data = await storage.getPayrollMovements(month, year, branchId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.get("/api/payroll/ui/payments", async (req, res) => {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const branchId = req.query.branchId
        ? Number(req.query.branchId)
        : undefined;
      if (!month || !year)
        return res.status(400).json({ message: "month و year مطلوبان" });
      const data = await storage.getPayrollPayments(month, year, branchId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.post("/api/payroll/ui/payments", async (req, res) => {
    try {
      const {
        employeeId,
        month,
        year,
        amount,
        paymentMethod,
        paidBy,
        branchId,
        note,
        referenceNo,
      } = req.body;
      if (
        !employeeId ||
        !month ||
        !year ||
        !amount ||
        !paymentMethod ||
        !paidBy
      ) {
        return res.status(400).json({ message: "بيانات ناقصة" });
      }
      const data = await storage.addPayrollPayment({
        employeeId: Number(employeeId),
        month: Number(month),
        year: Number(year),
        amount,
        paymentMethod,
        paidBy: Number(paidBy),
        branchId: branchId ? Number(branchId) : undefined,
        note,
        referenceNo,
      });
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.post("/api/payroll/ui/bulk-pay", async (req, res) => {
    try {
      const { employeeIds, month, year, paymentMethod, paidBy, branchId } =
        req.body;
      if (
        !Array.isArray(employeeIds) ||
        !month ||
        !year ||
        !paymentMethod ||
        !paidBy
      ) {
        return res.status(400).json({ message: "بيانات ناقصة" });
      }
      const movements = await storage.getPayrollMovements(
        Number(month),
        Number(year),
        branchId ? Number(branchId) : undefined,
      );
      const payments = await storage.getPayrollPayments(
        Number(month),
        Number(year),
        branchId ? Number(branchId) : undefined,
      );
      const employees = await storage.getPayrollEmployees(
        branchId ? Number(branchId) : undefined,
      );

      const results = [];
      for (const empId of employeeIds.map(Number)) {
        const emp = employees.find((e: any) => e.id === empId);
        if (!emp) continue;
        const empMovements = movements.filter(
          (m: any) => m.employee_id === empId && m.status === "active",
        );
        const empPayments = payments.filter(
          (p: any) => p.employee_id === empId,
        );
        const baseSalary = parseFloat(emp.salary ?? "0");
        const bonus = empMovements
          .filter((m: any) => m.type === "bonus")
          .reduce((s: number, m: any) => s + parseFloat(m.amount), 0);
        const commission = empMovements
          .filter((m: any) => m.type === "commission")
          .reduce((s: number, m: any) => s + parseFloat(m.amount), 0);
        const deduction = empMovements
          .filter((m: any) => m.type === "deduction")
          .reduce((s: number, m: any) => s + parseFloat(m.amount), 0);
        const advance = empMovements
          .filter((m: any) => m.type === "advance")
          .reduce((s: number, m: any) => s + parseFloat(m.amount), 0);
        const netSalary = Math.max(
          0,
          baseSalary + bonus + commission - deduction - advance,
        );
        const amountPaid = empPayments.reduce(
          (s: number, p: any) => s + parseFloat(p.amount),
          0,
        );
        const remaining = netSalary - amountPaid;
        if (remaining <= 0) continue;
        const result = await storage.addPayrollPayment({
          employeeId: empId,
          month: Number(month),
          year: Number(year),
          amount: remaining,
          paymentMethod,
          paidBy: Number(paidBy),
          branchId: branchId ? Number(branchId) : undefined,
        });
        results.push(result);
      }
      res.json({ count: results.length, payments: results });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.post("/api/payroll/ui/movements", async (req, res) => {
    try {
      const { type, employeeId, amount, date, reason, createdBy } = req.body;
      if (!type || !employeeId || !amount || !date || !createdBy) {
        return res.status(400).json({ message: "بيانات ناقصة" });
      }
      let result: any;
      const dateObj = new Date(date);
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
      const year = dateObj.getFullYear();
      if (type === "advance") {
        result = await storage.createEmployeeAdvance({
          employeeId: Number(employeeId),
          amount: String(amount),
          date,
          note: reason,
          createdBy: Number(createdBy),
        });
      } else if (type === "deduction") {
        result = await storage.createEmployeeDeduction({
          employeeId: Number(employeeId),
          amount: String(amount),
          reason: reason ?? "",
          date,
          createdBy: Number(createdBy),
        });
      } else if (type === "commission") {
        result = await storage.createEmployeeCommission({
          employeeId: Number(employeeId),
          amount: String(amount),
          date,
          note: reason,
          createdBy: Number(createdBy),
          month,
          year,
        });
      } else if (type === "bonus") {
        result = await storage.createEmployeeEntitlement({
          employeeId: Number(employeeId),
          amount: String(amount),
          date,
          note: reason,
          createdBy: Number(createdBy),
          month,
          year,
        });
      } else {
        return res.status(400).json({ message: "نوع غير مدعوم" });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  app.patch("/api/payroll/ui/movements/:table/:id/cancel", async (req, res) => {
    try {
      const table = req.params.table as string;
      const id = req.params.id;
      const { cancelledBy } = req.body;
      if (!cancelledBy)
        return res.status(400).json({ message: "cancelledBy مطلوب" });
      const allowedTables = [
        "employee_advances",
        "employee_deductions",
        "employee_commissions",
        "employee_entitlements",
      ];
      if (!allowedTables.includes(table))
        return res.status(400).json({ message: "جدول غير مدعوم" });
      let result: any;
      if (table === "employee_advances") {
        result = await storage.settleAdvance(Number(id), 0);
      } else {
        const { pool: dbPool } = await import("./db.ts");
        const r = await dbPool.query(
          `UPDATE ${table} SET status = 'cancelled' WHERE id = $1 RETURNING *`,
          [Number(id)],
        );
        result = r.rows[0];
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "خطأ في الخادم" });
    }
  });

  // Test Route
  app.get("/api/test", (_req, res) => {
    res.json({ ok: true, message: "API works" });
  });

  // Mimo AI Route
  app.post("/api/mimo", async (req, res) => {
    try {
      const message = req.body?.message;
      if (!message) {
        return res.status(400).json({ error: "message is required" });
      }

      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MIMO_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "xiaomi/mimo-v2-flash:free",
            messages: [{ role: "user", content: message }],
          }),
        },
      );

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";
      res.json({ ok: true, text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Import and register other routes
  const { registerExportRoutes } = require("./exports.ts");
  const { registerBackupRoutes } = require("./backup.ts");
  const { registerMobileRoutes } = require("./mobile-routes.ts");

  registerExportRoutes(app);
  registerBackupRoutes(app);
  registerMobileRoutes(app);

  // ✅ أعد httpServer كما هو (بدون تعديل)
  return httpServer;
}
