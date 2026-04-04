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
  await runMigrations();
  await seedDatabase();

  await registerRoutes(httpServer, app);
  initBackupScheduler();

  app.use(globalErrorHandler);

  // ✅ لا تضف app.use("/api", ...) هنا - فهو موجود في static.ts

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    logger.info(`serving on port ${port}`);
  });
})();
