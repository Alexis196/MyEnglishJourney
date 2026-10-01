import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  GEMINI_API_KEY: z.string().min(1).optional(),
  // gemini-1.5-* was fully retired (confirmed via a live models.list call on 2026-09-28) —
  // gemini-3.5-flash-lite is the current cost-efficient default. See pricing.ts for the
  // full verified pricing table if you want to switch to a different Gemini model.
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),

  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),

  // Safety limit for AI lesson generations a single user can start per rolling 24h. It caps cost only —
  // it never gates pedagogical progress (finishing a lesson always unlocks the next one).
  LESSON_GENERATIONS_PER_DAY: z.coerce.number().int().min(1).max(500).default(10),
  // Prepare the next lesson in the background right after a lesson is completed ("false" to disable).
  LESSON_PREFETCH_NEXT: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
});

// Treat blank env vars (e.g. `SUPABASE_URL=` left empty in .env) as unset rather than
// failing validation — this is the natural way people leave optional keys blank.
const sanitizedEnv = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== ""));

const parsed = envSchema.safeParse(sanitizedEnv);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration. Check .env.local against .env.example.");
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
