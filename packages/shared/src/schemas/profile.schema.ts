import { z } from "zod";
import { CEFR_LEVELS } from "../constants/exerciseTypes.js";

export const themePreferenceSchema = z.enum(["light", "dark", "system"]);
export type ThemePreference = z.infer<typeof themePreferenceSchema>;

export const explanationLanguageSchema = z.enum(["es", "en"]);
export type ExplanationLanguage = z.infer<typeof explanationLanguageSchema>;

export const profileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().nullable(),
  currentLevel: z.enum(CEFR_LEVELS).nullable(),
  explanationLanguage: explanationLanguageSchema,
  themePreference: themePreferenceSchema,
  timezone: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  currentPlanId: z.string().uuid().nullable(),
  streakCount: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  lastActivityDate: z.string().nullable(),
  updatedAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    currentLevel: z.enum(CEFR_LEVELS),
    explanationLanguage: explanationLanguageSchema,
    themePreference: themePreferenceSchema,
    timezone: z.string().max(64),
  })
  .partial();
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
