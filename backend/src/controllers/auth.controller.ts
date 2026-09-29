import type { Request, Response } from "express";
import type { Profile } from "@myenglishjourney/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { profileRepository, type UpdateProfileFields } from "../repositories/profile.repository.js";
import { UnauthorizedError } from "../utils/AppError.js";

function toProfileResponse(row: Awaited<ReturnType<typeof profileRepository.getById>>): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    currentLevel: row.current_level as Profile["currentLevel"],
    explanationLanguage: row.explanation_language,
    themePreference: row.theme_preference,
    timezone: row.timezone,
    onboardingCompleted: row.onboarding_completed,
    currentPlanId: row.current_plan_id,
    streakCount: row.streak_count,
    longestStreak: row.longest_streak,
    lastActivityDate: row.last_activity_date,
    updatedAt: row.updated_at,
  };
}

export const authController = {
  getMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const profile = await profileRepository.getById(req.supabase, req.user.id);
    res.json(toProfileResponse(profile));
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user || !req.supabase) throw new UnauthorizedError();
    const body = req.body as {
      fullName?: string;
      currentLevel?: string;
      explanationLanguage?: "es" | "en";
      themePreference?: "light" | "dark" | "system";
      timezone?: string;
    };

    const fields: UpdateProfileFields = {};
    if (body.fullName !== undefined) fields.full_name = body.fullName;
    if (body.currentLevel !== undefined) fields.current_level = body.currentLevel;
    if (body.explanationLanguage !== undefined) fields.explanation_language = body.explanationLanguage;
    if (body.themePreference !== undefined) fields.theme_preference = body.themePreference;
    if (body.timezone !== undefined) fields.timezone = body.timezone;

    const profile = await profileRepository.update(req.supabase, req.user.id, fields);
    res.json(toProfileResponse(profile));
  }),
};
