import pino from "pino";
import { env } from "../config/env";

/**
 * Never log request bodies or headers wholesale — they can carry JWTs or
 * exercise answers. Log structured fields explicitly instead.
 */
export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
});
