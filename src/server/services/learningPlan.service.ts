import type { SupabaseClient } from "@supabase/supabase-js";
import type { CefrLevel, CurrentLearningPlanResponse } from "@myenglishjourney/shared";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { planDayRepository } from "../repositories/planDay.repository";

export const learningPlanService = {
  async getCurrent(supabase: SupabaseClient, userId: string): Promise<CurrentLearningPlanResponse> {
    const plan = await learningPlanRepository.getActiveForUser(supabase, userId);
    if (!plan) return { plan: null, days: [] };

    const days = await planDayRepository.listForPlan(supabase, plan.id);

    return {
      plan: {
        id: plan.id,
        title: plan.title,
        status: plan.status,
        totalDays: plan.total_days,
        startDate: plan.start_date,
        targetLevelStart: plan.target_level_start as CefrLevel | null,
        targetLevelEnd: plan.target_level_end as CefrLevel | null,
        generatedBy: plan.generated_by,
      },
      days: days.map((day) => ({
        id: day.id,
        learningPlanId: day.learning_plan_id,
        dayNumber: day.day_number,
        weekNumber: day.week_number,
        dayType: day.day_type,
        lessonId: day.lesson_id,
        status: day.status,
        unlockedAt: day.unlocked_at,
        completedAt: day.completed_at,
      })),
    };
  },
};
