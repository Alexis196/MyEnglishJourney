import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonSectionRow } from "@myenglishjourney/shared";

export interface CreateLessonSectionInput {
  userId: string;
  lessonId: string;
  sectionType: LessonSectionRow["section_type"];
  orderIndex: number;
  title: string;
  content: Record<string, unknown>;
}

export const lessonSectionRepository = {
  async bulkInsert(supabase: SupabaseClient, rows: CreateLessonSectionInput[]): Promise<LessonSectionRow[]> {
    if (rows.length === 0) return [];
    const { data, error } = await supabase
      .from("lesson_sections")
      .insert(
        rows.map((row) => ({
          user_id: row.userId,
          lesson_id: row.lessonId,
          section_type: row.sectionType,
          order_index: row.orderIndex,
          title: row.title,
          content: row.content,
        })),
      )
      .select("*");
    if (error) throw error;
    return (data ?? []) as LessonSectionRow[];
  },
};
