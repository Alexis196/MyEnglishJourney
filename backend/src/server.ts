import { createApp } from "./app.js";
import { env, isSupabaseConfigured, isGeminiConfigured, isOpenAiConfigured } from "./config/env.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, supabase: isSupabaseConfigured, gemini: isGeminiConfigured, openai: isOpenAiConfigured },
    `My English Journey API listening on port ${env.PORT}`,
  );
  if (!isSupabaseConfigured) {
    logger.warn("Supabase is not configured — auth and data endpoints will return 503 until SUPABASE_URL/SUPABASE_ANON_KEY are set.");
  }
  if (!isGeminiConfigured && !isOpenAiConfigured) {
    logger.warn("No AI provider is configured — free-writing evaluation will degrade gracefully until GEMINI_API_KEY or OPENAI_API_KEY is set.");
  }
});
