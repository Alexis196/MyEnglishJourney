import { z } from "zod";
import { CEFR_LEVELS } from "@myenglishjourney/shared";

export const aiExerciseSchema = z.object({
  exerciseType: z.enum(["multiple_choice", "fill_in_blank", "translation_es_en", "translation_en_es", "free_writing"]),
  prompt: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctOptionIndex: z.number().int().optional(),
  sourceText: z.string().optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  minWords: z.number().int().optional(),
});
export type AIExercise = z.infer<typeof aiExerciseSchema>;

const aiVocabularyItemSchema = z.object({
  term: z.string(),
  translation: z.string(),
  example: z.string().optional(),
});

export const aiSectionSchema = z.object({
  sectionType: z.enum(["review", "vocabulary", "grammar", "interactive", "listening", "speaking", "final_assessment"]),
  title: z.string(),
  explanation: z.string().optional(),
  examples: z.array(z.string()).optional(),
  vocabulary: z.array(aiVocabularyItemSchema).optional(),
  exercises: z.array(aiExerciseSchema).default([]),
});
export type AISection = z.infer<typeof aiSectionSchema>;

const aiDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(90),
  dayType: z.enum(["lesson", "review", "rest", "assessment"]),
  theme: z.string(),
});

/**
 * The plan call returns only the skeleton (title + one theme per day); each day's lesson is generated on demand
 * by the lesson engine. Requiring exactly 90 entries from one call is fragile, so we accept a partial list
 * (>=60 of 90) and the service backfills any missing day.
 */
export const planGenerationResponseSchema = z.object({
  planTitle: z.string(),
  targetLevelEnd: z.enum(CEFR_LEVELS),
  days: z.array(aiDaySchema).min(60),
});
export type PlanGenerationResponse = z.infer<typeof planGenerationResponseSchema>;

/** One generated lesson (see lessons/lessonPrompt.ts for the contract given to the model). */
export const generatedLessonSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  sections: z.array(aiSectionSchema.extend({ exercises: z.array(aiExerciseSchema).optional() })).min(1),
});
type RawGeneratedLesson = z.infer<typeof generatedLessonSchema>;

/** A generated lesson after normalisation: every section has an (possibly empty) exercise list. */
export type GeneratedLesson = Omit<RawGeneratedLesson, "sections"> & {
  sections: Array<Omit<RawGeneratedLesson["sections"][number], "exercises"> & { exercises: AIExercise[] }>;
};

export function normalizeGeneratedLesson(raw: RawGeneratedLesson): GeneratedLesson {
  return { ...raw, sections: raw.sections.map((section) => ({ ...section, exercises: section.exercises ?? [] })) };
}
