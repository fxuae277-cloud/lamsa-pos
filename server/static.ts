import express, {
  type Express,
  Request,
  Response,
  NextFunction,
} from "express";
import path from "path";

export function serveStatic(app: Express): void {
  const distPath = path.resolve("dist");

  // 1. استثناء API routes باستخدام middleware
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.route) return next();
    res.status(404).json({
      error: "API_NOT_FOUND",
      message: "API endpoint does not exist",
      path: req.path,
    });
  });

  // 2. خدمة الملفات الثابتة
  app.use(express.static(distPath));

  // 3. ✅ للواجهة الأمامية - استخدام regex بدلاً من *
  app.get(/^\/(?!api).*/, (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
