import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseRow } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError.js";

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
};
