import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseAttemptRow } from "@myenglishjourney/shared";

export const exerciseAttemptRepository = {
  async getNextAttemptNumber(supabase: SupabaseClient, exerciseId: string, userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("exercise_attempts")
      .select("id", { count: "exact", head: true })
      .eq("exercise_id", exerciseId)
      .eq("user_id", userId);
    if (error) throw error;
    return (count ?? 0) + 1;
  },

  async insert(
    supabase: SupabaseClient,
    input: {
      userId: string;
      exerciseId: string;
      attemptNumber: number;
      response: Record<string, unknown>;
      isCorrect: boolean | null;
      score: number | null;
      aiFeedback: Record<string, unknown> | null;
      evaluationStatus: ExerciseAttemptRow["evaluation_status"];
    },
  ): Promise<ExerciseAttemptRow> {
    const { data, error } = await supabase
      .from("exercise_attempts")
      .insert({
        user_id: input.userId,
        exercise_id: input.exerciseId,
        attempt_number: input.attemptNumber,
        response: input.response,
        is_correct: input.isCorrect,
        score: input.score,
        ai_feedback: input.aiFeedback,
        evaluation_status: input.evaluationStatus,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as ExerciseAttemptRow;
  },
};
