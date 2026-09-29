import { z } from "zod";

export const aiProviderNameSchema = z.enum(["gemini", "openai"]);
export type AIProviderName = z.infer<typeof aiProviderNameSchema>;

export const aiProviderModeSchema = z.enum(["auto", "gemini_only", "openai_only"]);
export type AIProviderMode = z.infer<typeof aiProviderModeSchema>;

export const aiActivityTypeSchema = z.enum([
  "exercise_evaluation",
  "writing_feedback",
  "speaking_feedback",
  "plan_generation",
  "error_journal_analysis",
  "chat",
]);
export type AIActivityType = z.infer<typeof aiActivityTypeSchema>;

/**
 * Structured JSON contract every AI provider must return for a free-writing
 * (or any open-answer) evaluation. Distinguishes grammar errors from
 * natural-alternative style suggestions per spec — must never claim a
 * flawed answer is perfect just to be encouraging.
 */
export const writingFeedbackSchema = z.object({
  isAcceptable: z.boolean(),
  score: z.number().min(0).max(100),
  correctedText: z.string(),
  grammarErrors: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      explanation: z.string(),
    }),
  ),
  naturalAlternatives: z.array(
    z.object({
      original: z.string(),
      suggestion: z.string(),
      reason: z.string(),
    }),
  ),
  encouragingNote: z.string(),
  recommendation: z.string(),
});
export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

export const userAiSettingsSchema = z.object({
  providerMode: aiProviderModeSchema,
  monthlyBudgetUsd: z.number().nonnegative(),
  hardBlockAtBudget: z.boolean(),
  notifyAtPercent: z.number().int().min(1).max(100),
});
export type UserAiSettings = z.infer<typeof userAiSettingsSchema>;

export const updateUserAiSettingsSchema = userAiSettingsSchema.partial();
export type UpdateUserAiSettingsInput = z.infer<typeof updateUserAiSettingsSchema>;

export const aiUsageSummarySchema = z.object({
  providerMode: aiProviderModeSchema,
  monthlyBudgetUsd: z.number().nonnegative(),
  monthToDateSpendUsd: z.number().nonnegative(),
  percentUsed: z.number().nonnegative(),
  hardBlockAtBudget: z.boolean(),
  isBlocked: z.boolean(),
});
export type AIUsageSummary = z.infer<typeof aiUsageSummarySchema>;
