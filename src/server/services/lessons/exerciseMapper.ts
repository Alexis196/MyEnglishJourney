import type { CreateExerciseInput } from "../../repositories/exercise.repository";
import type { AIExercise } from "../ai/planGeneration.schema";

export type ExerciseInsertFields = Omit<CreateExerciseInput, "userId" | "lessonSectionId">;

/** Maps a model exercise to the DB shape (public content + server-only answer key); null when it is unusable. */
export function toDbExercise(ai: AIExercise, orderIndex: number): ExerciseInsertFields | null {
  switch (ai.exerciseType) {
    case "multiple_choice": {
      if (!ai.prompt || !ai.options || ai.options.length < 2 || ai.correctOptionIndex === undefined) return null;
      if (ai.correctOptionIndex < 0 || ai.correctOptionIndex >= ai.options.length) return null;
      return {
        exerciseType: "multiple_choice",
        orderIndex,
        content: { prompt: ai.prompt, options: ai.options },
        answerKey: { correctOptionIndex: ai.correctOptionIndex },
      };
    }
    case "fill_in_blank":
      if (!ai.prompt || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: "fill_in_blank",
        orderIndex,
        content: { prompt: ai.prompt },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "translation_es_en":
    case "translation_en_es":
      if (!ai.sourceText || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: ai.exerciseType,
        orderIndex,
        content: { sourceText: ai.sourceText },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "free_writing":
      if (!ai.prompt) return null;
      return {
        exerciseType: "free_writing",
        orderIndex,
        content: { prompt: ai.prompt, ...(ai.minWords ? { minWords: ai.minWords } : {}) },
        answerKey: {},
      };
    default:
      return null;
  }
}
