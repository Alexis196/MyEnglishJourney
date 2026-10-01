import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_OPEN_PLANS,
  type CurrentLearningPlanResponse,
  type GeneratePlanRequest,
  type PlanPersonalization,
} from "@myenglishjourney/shared";
import { ConflictError } from "../utils/AppError";
import { profileRepository } from "../repositories/profile.repository";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { planDayRepository, type CreatePlanDayInput } from "../repositories/planDay.repository";
import { learningGoalsRepository } from "../repositories/learningGoals.repository";
import { learningPlanService } from "./learningPlan.service";
import { aiRouter, buildPlanGenerationSystemPrompt, buildPlanGenerationUserPrompt, planGenerationResponseSchema } from "./ai/index";

const TOTAL_DAYS = 90;

/** What the lesson engine will know about the student for this plan (only what they actually provided). */
export function toPersonalization(input: GeneratePlanRequest): PlanPersonalization {
  return {
    ...(input.occupation ? { profession: input.occupation } : {}),
    interests: input.interests,
    ...(input.otherInterests ? { otherInterests: input.otherInterests } : {}),
    primaryGoal: input.mainGoal,
    focusAreas: input.focusAreas,
    minutesPerSession: input.dailyMinutesGoal,
  };
}

export const planGenerationService = {
  /**
   * Creates the plan skeleton: title, 90 days with their themes and types. Lessons are NOT generated here — each
   * day's lesson is prepared on demand by the lesson engine (day 1 is kicked off in the background by the route).
   */
  async generate(supabase: SupabaseClient, userId: string, input: GeneratePlanRequest): Promise<CurrentLearningPlanResponse> {
    const openPlans = await learningPlanRepository.countOpenForUser(supabase, userId);
    if (openPlans >= MAX_OPEN_PLANS) {
      throw new ConflictError(
        `Llegaste al máximo de ${MAX_OPEN_PLANS} planes activos. Archivá alguno para crear otro.`,
        "plan_limit_reached",
      );
    }

    const aiResult = await aiRouter.generate(supabase, {
      activityType: "plan_generation",
      systemPrompt: buildPlanGenerationSystemPrompt(),
      userPrompt: buildPlanGenerationUserPrompt({
        occupation: input.occupation,
        interests: input.interests,
        otherInterests: input.otherInterests,
        mainGoal: input.mainGoal,
        currentLevel: input.currentLevel,
        targetLevel: input.targetLevel,
        dailyMinutesGoal: input.dailyMinutesGoal,
        focusAreas: input.focusAreas,
        motivation: input.motivation,
      }),
      responseSchema: planGenerationResponseSchema,
      userId,
      maxOutputTokens: 6000,
    });

    const generated = aiResult.data;

    // Backfill any day numbers the model skipped in its (possibly incomplete) 90-day list, so the schedule
    // spine is always fully populated regardless of minor shortfalls in a single structured-generation call.
    const dayByNumber = new Map(generated.days.map((d) => [d.dayNumber, d]));
    const planDaysInput: CreatePlanDayInput[] = [];
    for (let dayNumber = 1; dayNumber <= TOTAL_DAYS; dayNumber++) {
      const aiDay = dayByNumber.get(dayNumber);
      planDaysInput.push({
        userId,
        learningPlanId: "", // filled in after the plan is created
        dayNumber,
        // Day 1 is always a regular lesson, whatever the model proposed.
        dayType: dayNumber === 1 ? "lesson" : (aiDay?.dayType ?? "review"),
        status: dayNumber === 1 ? "available" : "locked",
        unlockedAt: dayNumber === 1 ? new Date().toISOString() : null,
        theme: aiDay?.theme?.trim() || null,
        generationStatus: "pending",
      });
    }

    const plan = await learningPlanRepository.create(supabase, {
      userId,
      title: generated.planTitle,
      totalDays: TOTAL_DAYS,
      targetLevelStart: input.currentLevel,
      targetLevelEnd: generated.targetLevelEnd,
      generatedBy: "ai",
      personalization: toPersonalization(input),
    });

    await planDayRepository.bulkInsert(
      supabase,
      planDaysInput.map((d) => ({ ...d, learningPlanId: plan.id })),
    );

    await learningGoalsRepository.upsertForUser(supabase, {
      userId,
      targetLevel: input.targetLevel,
      focusAreas: input.focusAreas,
      dailyMinutesGoal: input.dailyMinutesGoal,
      motivation: input.motivation,
    });

    await profileRepository.update(supabase, userId, {
      current_level: input.currentLevel,
      current_plan_id: plan.id,
    });

    return learningPlanService.getCurrent(supabase, userId);
  },
};
