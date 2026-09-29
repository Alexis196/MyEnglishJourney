import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExerciseRow, LessonRow, LessonSectionRow } from "@myenglishjourney/shared";
import { NotFoundError } from "../utils/AppError.js";

export interface LessonWithSections extends LessonRow {
  lesson_sections: Array<LessonSectionRow & { exercises: ExerciseRow[] }>;
}

export const lessonRepository = {
  async getByIdForUser(supabase: SupabaseClient, userId: string, lessonId: string): Promise<LessonWithSections> {
    const { data, error } = await supabase
      .from("lessons")
      .select("*, lesson_sections(*, exercises(*))")
      .eq("id", lessonId)
      .eq("user_id", userId)
      .order("order_index", { foreignTable: "lesson_sections" })
      .order("order_index", { foreignTable: "lesson_sections.exercises" })
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new NotFoundError("Clase no encontrada");
    return data as LessonWithSections;
  },

  async updateProgress(
    supabase: SupabaseClient,
    lessonId: string,
    fields: { current_section_index: number; status: LessonRow["status"] },
  ): Promise<LessonRow> {
    const patch: Record<string, unknown> = {
      current_section_index: fields.current_section_index,
      status: fields.status,
      updated_at: new Date().toISOString(),
    };
    if (fields.status === "in_progress") patch.started_at = patch.started_at ?? new Date().toISOString();
    if (fields.status === "completed") patch.completed_at = new Date().toISOString();

    const { data, error } = await supabase.from("lessons").update(patch).eq("id", lessonId).select("*").single();
    if (error) throw error;
    return data as LessonRow;
  },
};
