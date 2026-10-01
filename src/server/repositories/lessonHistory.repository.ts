import type { SupabaseClient } from "@supabase/supabase-js";
import type { AttemptSample } from "../services/lessons/performance";
import type { HistoricAttempt, HistoricExercise } from "../services/lessons/reviewSelection";

interface HistoryLessonRow {
  plan_day_id: string;
  title: string;
  lesson_sections: Array<{
    section_type: string;
    content: { vocabulary?: Array<{ term: string }> } | null;
    exercises: Array<{
      id: string;
      exercise_type: string;
      content: Record<string, unknown>;
      answer_key: Record<string, unknown>;
    }>;
  }>;
}

/** Reads of past work used to personalize the next lesson (all scoped to the caller by RLS + explicit user filter). */
export const lessonHistoryRepository = {
  /**
   * Exercises and attempts of the given earlier days of one plan. Three small queries, only for the (at most
   * three) days the review looks at — never the whole history.
   */
  async loadForReview(
    supabase: SupabaseClient,
    userId: string,
    learningPlanId: string,
    dayNumbers: number[],
  ): Promise<{ exercises: HistoricExercise[]; attempts: HistoricAttempt[]; titlesByDay: Map<number, string> }> {
    const empty = { exercises: [], attempts: [], titlesByDay: new Map<number, string>() };
    if (dayNumbers.length === 0) return empty;

    const { data: days, error: daysError } = await supabase
      .from("plan_days")
      .select("id, day_number")
      .eq("learning_plan_id", learningPlanId)
      .in("day_number", dayNumbers)
      .not("lesson_id", "is", null);
    if (daysError) throw daysError;
    if (!days || days.length === 0) return empty;

    const dayNumberById = new Map(days.map((day) => [day.id as string, day.day_number as number]));

    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("plan_day_id, title, lesson_sections(section_type, content, exercises(id, exercise_type, content, answer_key))")
      .eq("user_id", userId)
      .in("plan_day_id", Array.from(dayNumberById.keys()));
    if (lessonsError) throw lessonsError;

    const exercises: HistoricExercise[] = [];
    const titlesByDay = new Map<number, string>();
    for (const lesson of (lessons ?? []) as unknown as HistoryLessonRow[]) {
      const dayNumber = dayNumberById.get(lesson.plan_day_id);
      if (dayNumber === undefined) continue;
      titlesByDay.set(dayNumber, lesson.title);
      for (const section of lesson.lesson_sections ?? []) {
        for (const exercise of section.exercises ?? []) {
          exercises.push({
            id: exercise.id,
            dayNumber,
            exerciseType: exercise.exercise_type,
            content: exercise.content ?? {},
            answerKey: exercise.answer_key ?? {},
            sectionVocabulary: section.content?.vocabulary ?? [],
          });
        }
      }
    }
    if (exercises.length === 0) return { exercises, attempts: [], titlesByDay };

    const { data: attempts, error: attemptsError } = await supabase
      .from("exercise_attempts")
      .select("exercise_id, is_correct, response, submitted_at")
      .eq("user_id", userId)
      .in("exercise_id", exercises.map((exercise) => exercise.id))
      .order("submitted_at", { ascending: false });
    if (attemptsError) throw attemptsError;

    return {
      exercises,
      attempts: (attempts ?? []).map((row) => ({
        exerciseId: row.exercise_id as string,
        isCorrect: row.is_correct as boolean | null,
        response: (row.response ?? {}) as Record<string, unknown>,
        submittedAt: row.submitted_at as string,
      })),
      titlesByDay,
    };
  },

  /** The student's most recent graded attempts across all plans, newest first. */
  async recentSamples(supabase: SupabaseClient, userId: string, limit: number): Promise<AttemptSample[]> {
    const { data, error } = await supabase
      .from("exercise_attempts")
      .select("exercise_id, is_correct, exercises(exercise_type, lesson_sections(section_type))")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    type Embedded<T> = T | T[] | null;
    const one = <T>(value: Embedded<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

    return (data ?? []).map((row) => {
      const exercise = one(row.exercises as Embedded<{ exercise_type: string; lesson_sections: Embedded<{ section_type: string }> }>);
      const section = exercise ? one(exercise.lesson_sections) : null;
      return {
        exerciseId: row.exercise_id as string,
        isCorrect: row.is_correct as boolean | null,
        exerciseType: exercise?.exercise_type ?? "multiple_choice",
        sectionType: section?.section_type ?? null,
      };
    });
  },
};
