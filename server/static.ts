import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  // ✅ استثناء صريح لـ API - يجب أن يكون قبل Catch-All
  app.get("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "API_NOT_FOUND",
      message: "API endpoint does not exist",
      path: req.path 
    });
  });

  // خدمة الملفات الثابتة من dist
  app.use(express.static(path.join(__dirname, "../dist")));

  // Catch-all للواجهة الأمامية (SPA)
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ 
        error: "API_NOT_FOUND",
        message: "API endpoint not found in catch-all"
      });
    }

    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}