import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningPlanRow } from "@myenglishjourney/shared";

export interface CreateLearningPlanInput {
  userId: string;
  title: string;
  totalDays: number;
  targetLevelStart: string;
  targetLevelEnd: string;
  generatedBy: "ai" | "manual" | "template";
}

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

  async create(supabase: SupabaseClient, input: CreateLearningPlanInput): Promise<LearningPlanRow> {
    const { data, error } = await supabase
      .from("learning_plans")
      .insert({
        user_id: input.userId,
        title: input.title,
        total_days: input.totalDays,
        target_level_start: input.targetLevelStart,
        target_level_end: input.targetLevelEnd,
        generated_by: input.generatedBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as LearningPlanRow;
  },
};
