import { updateProfileSchema, type Profile } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { profileRepository, type UpdateProfileFields } from "@/server/repositories/profile.repository";

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

export const GET = authedRoute({ services: ["supabase"] }, async ({ supabase, user }) => {
  const profile = await profileRepository.getById(supabase, user.id);
  return toProfileResponse(profile);
});

export const PATCH = authedRoute(
  { services: ["supabase"], schema: updateProfileSchema },
  async ({ supabase, user, body }) => {
    const fields: UpdateProfileFields = {};
    if (body.fullName !== undefined) fields.full_name = body.fullName;
    if (body.currentLevel !== undefined) fields.current_level = body.currentLevel;
    if (body.explanationLanguage !== undefined) fields.explanation_language = body.explanationLanguage;
    if (body.themePreference !== undefined) fields.theme_preference = body.themePreference;
    if (body.timezone !== undefined) fields.timezone = body.timezone;

    const profile = await profileRepository.update(supabase, user.id, fields);
    return toProfileResponse(profile);
  },
);
