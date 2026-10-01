import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError, NotFoundError } from "../utils/AppError";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { lessonRepository } from "../repositories/lesson.repository";
import { planDayRepository } from "../repositories/planDay.repository";

export interface DayCompletion {
  learningPlanId: string;
  /** The day that just became available, or null when nothing was unlocked (last day, or already unlocked). */
  unlockedDayNumber: number | null;
}

export const planDayProgressService = {
  /**
   * Day N completed -> mark N completed -> unlock N+1. Every step is a conditional UPDATE, so repeating the
   * call (double click, retry, two tabs) is harmless. On the last day the plan itself is closed.
   */
  async completeForLesson(supabase: SupabaseClient, userId: string, lessonId: string): Promise<DayCompletion> {
    const planDayId = await lessonRepository.getPlanDayId(supabase, lessonId);
    return this.completeDay(supabase, userId, planDayId);
  },

  async completeDay(supabase: SupabaseClient, userId: string, planDayId: string): Promise<DayCompletion> {
    const day = await planDayRepository.getById(supabase, planDayId);
    if (!day || day.user_id !== userId) throw new NotFoundError("Día no encontrado");

    // Only a day that is open can be completed; this also stops completing days that were never unlocked.
    if (day.status === "locked") throw new AppError("Este día todavía está bloqueado.", 409, "day_locked");

    await planDayRepository.markCompleted(supabase, day.id);

    const plan = await learningPlanRepository.getById(supabase, day.learning_plan_id);
    if (!plan) return { learningPlanId: day.learning_plan_id, unlockedDayNumber: null };

    if (day.day_number >= plan.total_days) {
      if (plan.status === "active") await learningPlanRepository.setStatus(supabase, plan.id, "completed");
      return { learningPlanId: plan.id, unlockedDayNumber: null };
    }

    const unlocked = await planDayRepository.unlock(supabase, plan.id, day.day_number + 1);
    return { learningPlanId: plan.id, unlockedDayNumber: unlocked?.day_number ?? null };
  },

  /** Rest days have no lesson: the student confirms them directly. */
  async completeRestDay(supabase: SupabaseClient, userId: string, planDayId: string): Promise<DayCompletion> {
    const day = await planDayRepository.getById(supabase, planDayId);
    if (!day || day.user_id !== userId) throw new NotFoundError("Día no encontrado");
    if (day.day_type !== "rest") throw new AppError("Solo los días de descanso se completan sin lección.", 400, "not_a_rest_day");
    return this.completeDay(supabase, userId, planDayId);
  },
};
