import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningPlanRow } from "@myenglishjourney/shared";

export const learningPlanRepository = {
  async getActiveForUser(supabase: SupabaseClient, userId: string): Promise<LearningPlanRow | null> {
    const { data, error } = await supabase
      .from("learning_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as LearningPlanRow | null) ?? null;
  },
};
