import { z } from "zod";
import { LESSON_STAGES } from "../constants/lessonStages";
import { exercisePublicSchema } from "./exercise.schema";

export const lessonSectionTypeSchema = z.enum([
  "review",
  "vocabulary",
  "grammar",
  "interactive",
  "listening",
  "speaking",
  "final_assessment",
]);
export type LessonSectionType = z.infer<typeof lessonSectionTypeSchema>;

export const vocabularyItemSchema = z.object({
  term: z.string(),
  translation: z.string(),
  example: z.string().optional(),
});
export type VocabularyItem = z.infer<typeof vocabularyItemSchema>;

/**
 * Free-form but validated content payload for a lesson section. Not every
 * field applies to every section_type (e.g. audioUrl only for listening) —
 * the renderer picks what it needs based on sectionType.
 */
/** A tiny visual pattern for the grammar point: a header row plus a few example rows, e.g. I | am | from Spain. */
export const grammarPatternSchema = z.object({
  columns: z.array(z.string()).min(2).max(5),
  rows: z.array(z.array(z.string())).min(1).max(6),
  note: z.string().optional(),
});
export type GrammarPattern = z.infer<typeof grammarPatternSchema>;

export const lessonSectionContentSchema = z.object({
  /** Where this section sits in the lesson's progression (absent in lessons generated before stages existed). */
  stage: z.enum(LESSON_STAGES).optional(),
  pattern: grammarPatternSchema.optional(),
  explanation: z.string().optional(),
  examples: z.array(z.string()).optional(),
  vocabulary: z.array(vocabularyItemSchema).optional(),
  audioUrl: z.string().url().optional(),
});
export type LessonSectionContent = z.infer<typeof lessonSectionContentSchema>;

export const lessonSectionSchema = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  sectionType: lessonSectionTypeSchema,
  orderIndex: z.number().int().nonnegative(),
  title: z.string(),
  content: lessonSectionContentSchema,
  completed: z.boolean(),
  exercises: z.array(exercisePublicSchema),
});
export type LessonSection = z.infer<typeof lessonSectionSchema>;

export const lessonStatusSchema = z.enum(["not_started", "in_progress", "completed"]);
export type LessonStatus = z.infer<typeof lessonStatusSchema>;

export const lessonDetailSchema = z.object({
  id: z.string().uuid(),
  planDayId: z.string().uuid(),
  title: z.string(),
  objective: z.string().nullable(),
  cefrLevel: z.string().nullable(),
  currentSectionIndex: z.number().int().nonnegative(),
  status: lessonStatusSchema,
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  sections: z.array(lessonSectionSchema),
});
export type LessonDetail = z.infer<typeof lessonDetailSchema>;

export const updateLessonProgressSchema = z.object({
  currentSectionIndex: z.number().int().nonnegative(),
  status: lessonStatusSchema.optional(),
});
export type UpdateLessonProgressInput = z.infer<typeof updateLessonProgressSchema>;

/** Result of asking the server to make sure a plan day has its lesson (see lessonEngine.service). */
export const ensureLessonResponseSchema = z.object({
  status: z.enum(["ready", "generating", "failed"]),
  lessonId: z.string().uuid().nullable(),
  /** Spanish, user-facing; only set when status is "failed". */
  message: z.string().optional(),
});
export type EnsureLessonResponse = z.infer<typeof ensureLessonResponseSchema>;
