import { isSupabaseConfigured, isAiConfigured, isGeminiConfigured } from "../config/env";
import { ServiceUnavailableError } from "../utils/AppError";

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
  // Audio-input features (Speaking Lab) only work through Gemini — OpenAI has no
  // audio path in this codebase, so an OpenAI-only setup should fail clearly here
  // rather than produce a generic "failed" analysis at request time.
  gemini: () =>
    isGeminiConfigured
      ? null
      : new ServiceUnavailableError(
          "Esta función requiere Gemini configurado (GEMINI_API_KEY) — no funciona solo con OpenAI. Consultá el README.",
          "gemini_not_configured",
        ),
};

export type ServiceName = keyof typeof checks;

export function assertServices(...services: ServiceName[]): void {
  for (const service of services) {
    const error = checks[service]();
    if (error) throw error;
  }
}
