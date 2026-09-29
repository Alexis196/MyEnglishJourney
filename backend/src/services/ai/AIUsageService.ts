import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserAiSettingsRow } from "@myenglishjourney/shared";
import { aiUsageLogRepository } from "../../repositories/aiUsageLog.repository.js";
import { userAiSettingsRepository } from "../../repositories/userAiSettings.repository.js";
import { computeCostUsd } from "./pricing.js";
import type { AIActivityType, AIProviderName, AITokenUsage, ClassifiedAIError } from "./types.js";

export interface BudgetCheckResult {
  allowed: boolean;
  monthToDateSpendUsd: number;
  percentUsed: number;
  settings: UserAiSettingsRow;
}

export const AIUsageService = {
  async getSettings(supabase: SupabaseClient, userId: string): Promise<UserAiSettingsRow> {
    return userAiSettingsRepository.getForUser(supabase, userId);
  },

  /**
   * Checked by AIRouter before every call. Blocking here (rather than only
   * after the fact) is what makes the budget preventive instead of purely
   * informational — but see the README's cost-control caveats: concurrent
   * requests and provider billing latency mean this is a best-effort guard,
   * not an absolute spending guarantee.
   */
  async checkBudget(supabase: SupabaseClient, userId: string): Promise<BudgetCheckResult> {
    const settings = await userAiSettingsRepository.getForUser(supabase, userId);
    const monthToDateSpendUsd = await aiUsageLogRepository.getMonthToDateSpendUsd(supabase, userId);
    const percentUsed = settings.monthly_budget_usd > 0 ? (monthToDateSpendUsd / settings.monthly_budget_usd) * 100 : 0;
    const overBudget = monthToDateSpendUsd >= settings.monthly_budget_usd;

    return {
      allowed: !(settings.hard_block_at_budget && overBudget),
      monthToDateSpendUsd,
      percentUsed,
      settings,
    };
  },

  async logSuccess(
    supabase: SupabaseClient,
    params: {
      userId: string;
      provider: AIProviderName;
      model: string;
      activityType: AIActivityType;
      usage: AITokenUsage;
      latencyMs: number;
    },
  ): Promise<void> {
    const costUsd = computeCostUsd(params.provider, params.model, {
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
    });

    await aiUsageLogRepository.insert(supabase, {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      activityType: params.activityType,
      promptTokens: params.usage.promptTokens,
      completionTokens: params.usage.completionTokens,
      totalTokens: params.usage.totalTokens,
      costUsd,
      latencyMs: params.latencyMs,
      status: "success",
    });
  },

  async logFailure(
    supabase: SupabaseClient,
    userId: string,
    activityType: AIActivityType,
    classified: ClassifiedAIError,
    willFallback: boolean,
  ): Promise<void> {
    await aiUsageLogRepository.insert(supabase, {
      userId,
      provider: classified.providerName,
      model: "unknown",
      activityType,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      status: willFallback ? "fallback" : "error",
      errorCode: classified.category,
    });
  },
};
