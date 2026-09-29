import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  // 12mb accommodates base64-encoded Speaking Lab audio (capped at 8MB of base64
  // text by submitSpeakingRecordingSchema) plus JSON overhead; every other route
  // sends far smaller payloads.
  app.use(express.json({ limit: "12mb" }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req: express.Request) => req.url === "/api/health" } }));

  // Generous but real ceiling against abusive/looping clients; AI-specific spend
  // protection is handled separately by AIUsageService's budget check.
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use("/api", apiRouter);

  app.use(errorHandler);

  return app;
}
