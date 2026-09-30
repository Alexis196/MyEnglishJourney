import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanDayRow } from "@myenglishjourney/shared";

export interface CreatePlanDayInput {
  userId: string;
  learningPlanId: string;
  dayNumber: number;
  dayType: PlanDayRow["day_type"];
  status: PlanDayRow["status"];
  unlockedAt?: string | null;
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
};
