import type { SupabaseClient } from "@supabase/supabase-js";
import { BudgetExceededError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { AIErrorClassifier } from "./AIErrorClassifier.js";
import { AIUsageService } from "./AIUsageService.js";
import type { AIGenerationRequest, AIGenerationResult, AIProvider, ClassifiedAIError } from "./types.js";

export class AIProviderFailureError extends Error {
  constructor(public lastError: ClassifiedAIError | undefined) {
    super(lastError ? `Todos los proveedores de IA fallaron: ${lastError.message}` : "Ningún proveedor de IA está disponible");
    this.name = "AIProviderFailureError";
  }
}

export interface AIRouterOptions {
  maxRetriesPerProvider?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Equal-jitter exponential backoff: half fixed delay, half random. */
function backoffWithJitter(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return delay / 2 + Math.random() * (delay / 2);
}

export class AIRouter {
  private readonly maxRetriesPerProvider: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;

  constructor(
    private readonly gemini: AIProvider,
    private readonly openai: AIProvider,
    options: AIRouterOptions = {},
  ) {
    this.maxRetriesPerProvider = options.maxRetriesPerProvider ?? 2;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.maxDelayMs = options.maxDelayMs ?? 8000;
  }

  async generate<T>(supabase: SupabaseClient, request: AIGenerationRequest<T>): Promise<AIGenerationResult<T>> {
    const budget = await AIUsageService.checkBudget(supabase, request.userId);
    if (!budget.allowed) {
      throw new BudgetExceededError(
        `Se alcanzó el presupuesto mensual de IA ($${budget.settings.monthly_budget_usd}). Ajustalo en Configuración para seguir usando funciones de IA.`,
      );
    }

    // Audio input isn't implemented for OpenAIProvider (it would need a separate
    // transcription call via a different API) — audio requests always go to Gemini,
    // regardless of the user's configured provider_mode.
    const providerOrder: AIProvider[] = request.audio
      ? [this.gemini]
      : budget.settings.provider_mode === "gemini_only"
        ? [this.gemini]
        : budget.settings.provider_mode === "openai_only"
          ? [this.openai]
          : [this.gemini, this.openai];

    let lastError: ClassifiedAIError | undefined;

    for (const provider of providerOrder) {
      if (!provider.isConfigured()) continue;

      for (let attempt = 0; attempt <= this.maxRetriesPerProvider; attempt++) {
        try {
          const result = await provider.generateStructured(request);
          await AIUsageService.logSuccess(supabase, {
            userId: request.userId,
            provider: result.provider,
            model: result.model,
            activityType: request.activityType,
            usage: result.usage,
            latencyMs: result.latencyMs,
          });
          return result;
        } catch (error) {
          const classified = AIErrorClassifier.classify(error, provider.name);
          lastError = classified;

          const isLastAttemptForProvider = attempt === this.maxRetriesPerProvider;
          const willFallback = classified.fallbackEligible && (isLastAttemptForProvider || !classified.retryable);

          await AIUsageService.logFailure(supabase, request.userId, request.activityType, classified, willFallback);

          if (classified.retryable && !isLastAttemptForProvider) {
            const delay = backoffWithJitter(attempt, this.baseDelayMs, this.maxDelayMs);
            logger.warn({ provider: provider.name, attempt, category: classified.category, delay }, "Retrying AI provider call");
            await sleep(delay);
            continue;
          }

          if (classified.fallbackEligible) {
            logger.warn({ provider: provider.name, category: classified.category }, "Falling back to next AI provider");
            break; // move to next provider in providerOrder
          }

          // Terminal, non-fallback-eligible error (auth/invalid_request/safety_block): stop immediately.
          throw new AIProviderFailureError(classified);
        }
      }
    }

    throw new AIProviderFailureError(lastError);
  }
}
