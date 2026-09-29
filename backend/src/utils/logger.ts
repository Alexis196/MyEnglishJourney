import pino from "pino";
import { env } from "../config/env.js";

/**
 * Never log request bodies or headers wholesale — they can carry JWTs or
 * exercise answers. Log structured fields explicitly instead.
 */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});
