import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CefrLevel,
  CurrentLearningPlanResponse,
  LearningPlanListResponse,
  LearningPlanSummary,
  LearningPlanRow,
} from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError";
import { profileRepository } from "../repositories/profile.repository";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { planDayRepository } from "../repositories/planDay.repository";

function toPlan(plan: LearningPlanRow) {
  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    totalDays: plan.total_days,
    startDate: plan.start_date,
    targetLevelStart: plan.target_level_start as CefrLevel | null,
    targetLevelEnd: plan.target_level_end as CefrLevel | null,
    generatedBy: plan.generated_by,
  };
}

export const learningPlanService = {
  async list(supabase: SupabaseClient, userId: string): Promise<LearningPlanListResponse> {
    const profile = await profileRepository.getById(supabase, userId);
    const plans = await learningPlanRepository.listForUser(supabase, userId);
    const current = await learningPlanRepository.getCurrentForUser(supabase, userId, profile.current_plan_id);
    const completed = await planDayRepository.countCompletedByPlan(
      supabase,
      plans.map((p) => p.id),
    );

    const summaries: LearningPlanSummary[] = plans.map((plan) => ({
      ...toPlan(plan),
      isCurrent: plan.id === current?.id,
      completedDays: completed.get(plan.id) ?? 0,
      createdAt: plan.created_at,
    }));
    return { plans: summaries };
  },

  async select(supabase: SupabaseClient, userId: string, planId: string): Promise<CurrentLearningPlanResponse> {
    const plan = await learningPlanRepository.getById(supabase, planId);
    if (!plan || plan.user_id !== userId || plan.status === "archived") {
      throw new NotFoundError("Plan no encontrado");
    }
    await profileRepository.update(supabase, userId, { current_plan_id: plan.id });
    return this.getCurrent(supabase, userId);
  },

  /** Archived plans leave the picker; if it was the selected one, fall back to another plan. */
  async archive(supabase: SupabaseClient, userId: string, planId: string): Promise<CurrentLearningPlanResponse> {
    const plan = await learningPlanRepository.getById(supabase, planId);
    if (!plan || plan.user_id !== userId) throw new NotFoundError("Plan no encontrado");

    await learningPlanRepository.setStatus(supabase, plan.id, "archived");

    const profile = await profileRepository.getById(supabase, userId);
    if (profile.current_plan_id === plan.id) {
      const fallback = await learningPlanRepository.getActiveForUser(supabase, userId);
      await profileRepository.update(supabase, userId, { current_plan_id: fallback?.id ?? null });
    }
    return this.getCurrent(supabase, userId);
  },

  async getCurrent(supabase: SupabaseClient, userId: string): Promise<CurrentLearningPlanResponse> {
    const profile = await profileRepository.getById(supabase, userId);
    const plan = await learningPlanRepository.getCurrentForUser(supabase, userId, profile.current_plan_id);
    if (!plan) return { plan: null, days: [] };

    const days = await planDayRepository.listForPlan(supabase, plan.id);

    return {
      plan: toPlan(plan),
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
