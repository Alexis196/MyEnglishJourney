import { z } from "zod";
import { CEFR_LEVELS } from "@myenglishjourney/shared";

const aiExerciseSchema = z.object({
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

const aiSectionSchema = z.object({
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
 * Requiring exactly 90 entries from a single generation call is fragile —
 * models occasionally under/overshoot a long structured list. We accept a
 * partial skeleton (>=60 of 90) and the service backfills any missing day
 * numbers with a generic review day rather than failing the whole plan.
 */
export const planGenerationResponseSchema = z.object({
  planTitle: z.string(),
  targetLevelEnd: z.enum(CEFR_LEVELS),
  days: z.array(aiDaySchema).min(60),
  firstLesson: z.object({
    title: z.string(),
    objective: z.string(),
    sections: z.array(aiSectionSchema).min(1),
  }),
});
export type PlanGenerationResponse = z.infer<typeof planGenerationResponseSchema>;
