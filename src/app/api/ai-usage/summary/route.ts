import type { AIUsageSummary } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { AIUsageService } from "@/server/services/ai/index";

export const GET = authedRoute({ services: ["supabase"] }, async ({ supabase, user }) => {
  const budget = await AIUsageService.checkBudget(supabase, user.id);

  const summary: AIUsageSummary = {
    providerMode: budget.settings.provider_mode,
    monthlyBudgetUsd: budget.settings.monthly_budget_usd,
    monthToDateSpendUsd: budget.monthToDateSpendUsd,
    percentUsed: Math.round(budget.percentUsed),
    hardBlockAtBudget: budget.settings.hard_block_at_budget,
    isBlocked: !budget.allowed,
  };
  return summary;
});
