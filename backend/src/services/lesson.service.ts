import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExercisePublic, LessonDetail, LessonSection } from "@myenglishjourney/shared";
import { lessonRepository } from "../repositories/lesson.repository.js";

export const lessonService = {
  async getForUser(supabase: SupabaseClient, userId: string, lessonId: string): Promise<LessonDetail> {
    const lesson = await lessonRepository.getByIdForUser(supabase, userId, lessonId);

    const sections: LessonSection[] = lesson.lesson_sections
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((section) => ({
        id: section.id,
        lessonId: section.lesson_id,
        sectionType: section.section_type as LessonSection["sectionType"],
        orderIndex: section.order_index,
        title: section.title,
        content: section.content as LessonSection["content"],
        completed: section.completed,
        // answer_key is intentionally dropped here — it must never reach the client.
        exercises: section.exercises
          .slice()
          .sort((a, b) => a.order_index - b.order_index)
          .map(
            (exercise) =>
              ({
                id: exercise.id,
                lessonSectionId: exercise.lesson_section_id,
                orderIndex: exercise.order_index,
                difficulty: exercise.difficulty,
                points: exercise.points,
                exerciseType: exercise.exercise_type,
                content: exercise.content,
              }) as ExercisePublic,
          ),
      }));

    return {
      id: lesson.id,
      planDayId: lesson.plan_day_id,
      title: lesson.title,
      objective: lesson.objective,
      cefrLevel: lesson.cefr_level,
      currentSectionIndex: lesson.current_section_index,
      status: lesson.status,
      startedAt: lesson.started_at,
      completedAt: lesson.completed_at,
      sections,
    };
  },

  async updateProgress(
    supabase: SupabaseClient,
    lessonId: string,
    input: { currentSectionIndex: number; status?: LessonDetail["status"] },
  ): Promise<void> {
    await lessonRepository.updateProgress(supabase, lessonId, {
      current_section_index: input.currentSectionIndex,
      status: input.status ?? "in_progress",
    });
  },
};
