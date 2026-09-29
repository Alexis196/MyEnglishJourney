import type { Request, Response } from "express";
import type { AIUsageSummary } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { AIUsageService } from "../services/ai/index.js";
import { UnauthorizedError } from "../utils/AppError.js";

export const aiUsageController = {
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const budget = await AIUsageService.checkBudget(req.supabase, req.user.id);

    const summary: AIUsageSummary = {
      providerMode: budget.settings.provider_mode,
      monthlyBudgetUsd: budget.settings.monthly_budget_usd,
      monthToDateSpendUsd: budget.monthToDateSpendUsd,
      percentUsed: Math.round(budget.percentUsed),
      hardBlockAtBudget: budget.settings.hard_block_at_budget,
      isBlocked: !budget.allowed,
    };
    res.json(summary);
  }),
};
