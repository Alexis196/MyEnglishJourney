import type { SupabaseClient } from "@supabase/supabase-js";

export interface UpsertLearningGoalsInput {
  userId: string;
  targetLevel: string;
  focusAreas: string[];
  dailyMinutesGoal: number;
  motivation?: string;
}

export const learningGoalsRepository = {
  async upsertForUser(supabase: SupabaseClient, input: UpsertLearningGoalsInput): Promise<void> {
    const { data: existing, error: selectError } = await supabase
      .from("learning_goals")
      .select("id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (selectError) throw selectError;

    const fields = {
      user_id: input.userId,
      target_level: input.targetLevel,
      focus_areas: input.focusAreas,
      daily_minutes_goal: input.dailyMinutesGoal,
      motivation: input.motivation ?? null,
    };

    if (existing) {
      const { error } = await supabase.from("learning_goals").update(fields).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("learning_goals").insert(fields);
      if (error) throw error;
    }
  },
};
