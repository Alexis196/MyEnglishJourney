import type { NextFunction, Request, Response } from "express";
import { isSupabaseConfigured, isAiConfigured } from "../config/env.js";
import { ServiceUnavailableError } from "../utils/AppError.js";

const checks = {
  supabase: () =>
    isSupabaseConfigured
      ? null
      : new ServiceUnavailableError(
          "Supabase no está configurado en el servidor (SUPABASE_URL / SUPABASE_ANON_KEY). Consultá el README.",
          "supabase_not_configured",
        ),
  ai: () =>
    isAiConfigured
      ? null
      : new ServiceUnavailableError(
          "Ningún proveedor de IA está configurado (GEMINI_API_KEY / OPENAI_API_KEY). Consultá el README.",
          "ai_not_configured",
        ),
};

export function serviceAvailability(...services: Array<keyof typeof checks>) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    for (const service of services) {
      const error = checks[service]();
      if (error) return next(error);
    }
    next();
  };
}
