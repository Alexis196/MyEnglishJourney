import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, code: err.code }, "Unhandled application error");
    }
    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  logger.error({ err, path: req.path }, "Unexpected error");
  res.status(500).json({ message: "Ocurrió un error inesperado en el servidor", code: "internal_error" });
}
