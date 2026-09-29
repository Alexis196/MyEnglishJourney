import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseRow } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError.js";

export interface CreateExerciseInput {
  userId: string;
  lessonSectionId: string;
  exerciseType: ExerciseRow["exercise_type"];
  orderIndex: number;
  content: Record<string, unknown>;
  answerKey: Record<string, unknown>;
  points?: number;
}

export const exerciseRepository = {
  async getByIdForUser(supabase: SupabaseClient, userId: string, exerciseId: string): Promise<ExerciseRow> {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", exerciseId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError("Ejercicio no encontrado");
    return data as ExerciseRow;
  },

  async bulkInsert(supabase: SupabaseClient, rows: CreateExerciseInput[]): Promise<ExerciseRow[]> {
    if (rows.length === 0) return [];
    const { data, error } = await supabase
      .from("exercises")
      .insert(
        rows.map((row) => ({
          user_id: row.userId,
          lesson_section_id: row.lessonSectionId,
          exercise_type: row.exerciseType,
          order_index: row.orderIndex,
          content: row.content,
          answer_key: row.answerKey,
          points: row.points ?? 10,
        })),
      )
      .select("*");
    if (error) throw error;
    return (data ?? []) as ExerciseRow[];
  },
};
