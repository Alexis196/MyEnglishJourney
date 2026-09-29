import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanDayRow } from "@myenglishjourney/shared";

export const planDayRepository = {
  async listForPlan(supabase: SupabaseClient, learningPlanId: string): Promise<PlanDayRow[]> {
    const { data, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("learning_plan_id", learningPlanId)
      .order("day_number", { ascending: true });
    if (error) throw error;
    return (data ?? []) as PlanDayRow[];
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
