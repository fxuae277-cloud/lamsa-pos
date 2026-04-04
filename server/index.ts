import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase } from "./seed";
import { runMigrations } from "./migrate";
import { initBackupScheduler } from "./backup";
import { apiLimiter } from "./middleware/rateLimiter";
import { globalErrorHandler } from "./middleware/errorHandler";
import { logger } from "./logger";

console.log("MIMO KEY:", process.env.MIMO_API_KEY ? "FOUND" : "MISSING");

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(apiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    if (!reqPath.startsWith("/api")) return;
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      path: reqPath,
      status: res.statusCode,
      duration,
      userId: req.jwtUser?.userId ?? null,
      ip: req.ip,
    };
    if (duration > 500) {
      logger.warn("SLOW_REQUEST", meta);
    } else {
      logger.info("request", meta);
    }
  });

  next();
});

(async () => {
  // 1. تشغيل المigrations والـ seed
  await runMigrations();
  await seedDatabase();

  // 2. تسجيل الـ Routes
  await registerRoutes(httpServer, app);

  // 3. تشغيل الـ Backup Scheduler
  initBackupScheduler();

  // 4. Error Handler
  app.use(globalErrorHandler);

  // 5. 🛡️ حماية API Routes من catch-all
  app.use("/api", (req, res) => {
    res.status(404).json({
      error: "API_ROUTE_NOT_FOUND",
      path: req.path,
      method: req.method,
    });
  });

  // 6. إعداد Static files أو Vite ✅
  if (process.env.NODE_ENV === "production") {
    serveStatic(app); // ← استدعاء مباشر بدون await
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // 7. تشغيل السيرفر
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      logger.info(`serving on port ${port}`);
    },
  );
})();
