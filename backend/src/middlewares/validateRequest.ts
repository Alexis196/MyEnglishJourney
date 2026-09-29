import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/AppError.js";

export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError("Datos de solicitud inválidos", 400, "invalid_request", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
