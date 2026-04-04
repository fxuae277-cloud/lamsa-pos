import express, { type Express } from "express";
import path from "path";

export function serveStatic(app: Express) {
  // ✅ استخدم path.resolve بدلاً من import.meta
  const distPath = path.resolve("dist");

  // استثناء صريح لـ API
  app.get("/api/*", (req, res) => {
    res.status(404).json({
      error: "API_NOT_FOUND",
      message: "API endpoint does not exist",
      path: req.path,
    });
  });

  // خدمة الملفات الثابتة
  app.use(express.static(distPath));

  // Catch-all للواجهة الأمامية
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({
        error: "API_NOT_FOUND",
        message: "API endpoint not found in catch-all",
      });
    }

    res.sendFile(path.join(distPath, "index.html"));
  });
}
