import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check backend/.env against backend/.env.example.");
}

export const env = parsed.data;

/**
 * These flags let the app boot and serve /api/health with a clear status
 * instead of throwing on a missing client somewhere deep in a request —
 * routes that need a given service check the flag via serviceAvailability
 * middleware and return 503 with a descriptive message instead.
 */
export const isSupabaseConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
export const isGeminiConfigured = Boolean(env.GEMINI_API_KEY);
export const isOpenAiConfigured = Boolean(env.OPENAI_API_KEY);
export const isAiConfigured = isGeminiConfigured || isOpenAiConfigured;
