import express, { type Express } from "express";
import path from "path";

export function serveStatic(app: Express): void {
  const distPath = path.resolve("dist");

  // ✅ استخدام app.use بدلاً من app.get("/api/*")
  app.use("/api", (req, res, next) => {
    // إذا كان المسار لم يُعالج من قبل routes المسجلة
    if (req.route) return next();
    res.status(404).json({
      error: "API_NOT_FOUND",
      message: "API endpoint does not exist",
      path: req.path,
    });
  });

  // خدمة الملفات الثابتة
  app.use(express.static(distPath));

  // Catch-all للواجهة الأمامية (SPA)
  app.get("*", (req, res) => {
    // لا تخدم index.html للـ API
    if (req.path.startsWith("/api")) {
      return res.status(404).json({
        error: "API_NOT_FOUND",
        message: "API endpoint not found in catch-all",
      });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
