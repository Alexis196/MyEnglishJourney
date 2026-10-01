import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanDayRow } from "@myenglishjourney/shared";

export interface CreatePlanDayInput {
  userId: string;
  learningPlanId: string;
  dayNumber: number;
  dayType: PlanDayRow["day_type"];
  status: PlanDayRow["status"];
  unlockedAt?: string | null;
  theme?: string | null;
  generationStatus?: PlanDayRow["generation_status"];
}

export const planDayRepository = {
  async bulkInsert(supabase: SupabaseClient, rows: CreatePlanDayInput[]): Promise<PlanDayRow[]> {
    const { data, error } = await supabase
      .from("plan_days")
      .insert(
        rows.map((row) => ({
          user_id: row.userId,
          learning_plan_id: row.learningPlanId,
          day_number: row.dayNumber,
          day_type: row.dayType,
          status: row.status,
          unlocked_at: row.unlockedAt ?? null,
          theme: row.theme ?? null,
          generation_status: row.generationStatus ?? "pending",
        })),
      )
      .select("*");
    if (error) throw error;
    return (data ?? []) as PlanDayRow[];
  },

  async setLesson(supabase: SupabaseClient, planDayId: string, lessonId: string): Promise<void> {
    const { error } = await supabase.from("plan_days").update({ lesson_id: lessonId }).eq("id", planDayId);
    if (error) throw error;
  },

  async listForPlan(supabase: SupabaseClient, learningPlanId: string): Promise<PlanDayRow[]> {
    const { data, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("learning_plan_id", learningPlanId)
      .order("day_number", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PlanDayRow[];
  },

  /** Number of completed days per plan, for the plan picker. */
  async countCompletedByPlan(supabase: SupabaseClient, learningPlanIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (learningPlanIds.length === 0) return counts;
    const { data, error } = await supabase
      .from("plan_days")
      .select("learning_plan_id")
      .in("learning_plan_id", learningPlanIds)
      .eq("status", "completed");
    if (error) throw error;
    for (const row of data ?? []) {
      const id = row.learning_plan_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  },

  async getNextAvailable(supabase: SupabaseClient, learningPlanId: string): Promise<PlanDayRow | null> {
    const { data, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("learning_plan_id", learningPlanId)
      .eq("status", "available")
      .order("day_number", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as PlanDayRow | null) ?? null;
  },

  async getById(supabase: SupabaseClient, planDayId: string): Promise<PlanDayRow | null> {
    const { data, error } = await supabase.from("plan_days").select("*").eq("id", planDayId).maybeSingle();
    if (error) throw error;
    return (data as PlanDayRow | null) ?? null;
  },

  async getByNumber(supabase: SupabaseClient, learningPlanId: string, dayNumber: number): Promise<PlanDayRow | null> {
    const { data, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("learning_plan_id", learningPlanId)
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (error) throw error;
    return (data as PlanDayRow | null) ?? null;
  },

  /**
   * Atomically takes the right to generate a day's lesson. A single conditional UPDATE: only one concurrent
   * caller gets a row back. A day stuck in "generating" (instance died mid-call) becomes claimable again once
   * `staleBefore` has passed. Returns null when someone else holds it or it is already ready.
   */
  async claimGeneration(
    supabase: SupabaseClient,
    planDayId: string,
    params: { staleBefore: string; nextAttempt: number },
  ): Promise<PlanDayRow | null> {
    const { data, error } = await supabase
      .from("plan_days")
      .update({
        generation_status: "generating",
        generation_started_at: new Date().toISOString(),
        generation_attempts: params.nextAttempt,
        generation_error: null,
      })
      .eq("id", planDayId)
      .is("lesson_id", null)
      .or(`generation_status.in.(pending,failed),and(generation_status.eq.generating,generation_started_at.lt.${params.staleBefore})`)
      .select("*");
    if (error) throw error;
    return ((data ?? [])[0] as PlanDayRow | undefined) ?? null;
  },

  async markReady(supabase: SupabaseClient, planDayId: string, lessonId: string): Promise<void> {
    const { error } = await supabase
      .from("plan_days")
      .update({ lesson_id: lessonId, generation_status: "ready", generation_error: null })
      .eq("id", planDayId);
    if (error) throw error;
  },

  async markFailed(supabase: SupabaseClient, planDayId: string, errorCode: string): Promise<void> {
    const { error } = await supabase
      .from("plan_days")
      .update({ generation_status: "failed", generation_error: errorCode.slice(0, 120) })
      .eq("id", planDayId)
      .eq("generation_status", "generating");
    if (error) throw error;
  },

  /** Generations this user started since `sinceIso` (used for the per-user safety limit). */
  async countGenerationsSince(supabase: SupabaseClient, userId: string, sinceIso: string, excludeDayId: string): Promise<number> {
    const { count, error } = await supabase
      .from("plan_days")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("generation_started_at", sinceIso)
      .neq("id", excludeDayId);
    if (error) throw error;
    return count ?? 0;
  },

  /** Marks a day completed. Idempotent: returns false when it was already completed (or not unlocked). */
  async markCompleted(supabase: SupabaseClient, planDayId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("plan_days")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", planDayId)
      .eq("status", "available")
      .select("id");
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  /** Unlocks a day if it is still locked; returns its row, or null when there is nothing to unlock. */
  async unlock(supabase: SupabaseClient, learningPlanId: string, dayNumber: number): Promise<PlanDayRow | null> {
    const { data, error } = await supabase
      .from("plan_days")
      .update({ status: "available", unlocked_at: new Date().toISOString() })
      .eq("learning_plan_id", learningPlanId)
      .eq("day_number", dayNumber)
      .eq("status", "locked")
      .select("*");
    if (error) throw error;
    return ((data ?? [])[0] as PlanDayRow | undefined) ?? null;
  },
};
