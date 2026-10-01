import { z } from "zod";

const exerciseBaseShape = {
  id: z.string().uuid(),
  lessonSectionId: z.string().uuid(),
  orderIndex: z.number().int().nonnegative(),
  difficulty: z.string().nullable(),
  points: z.number().int().positive(),
};

/**
 * Public (client-safe) shape per exercise type: content only, never the
 * answer key. Phase 1 fully implements multiple_choice, fill_in_blank,
 * translation_es_en, translation_en_es (closed, auto-validated) and
 * free_writing (open, AI-evaluated). The remaining five types share the
 * exercises table/RLS but their content/answerKey shapes below are
 * placeholders reserved for a later phase — no validator or UI renders
 * them yet.
 */
export const exercisePublicSchema = z.discriminatedUnion("exerciseType", [
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("multiple_choice"),
    content: z.object({ prompt: z.string(), options: z.array(z.string()).min(2) }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("fill_in_blank"),
    content: z.object({ prompt: z.string() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("word_ordering"),
    content: z.object({ words: z.array(z.string()), prompt: z.string().optional() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("translation_es_en"),
    content: z.object({ sourceText: z.string() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("translation_en_es"),
    content: z.object({ sourceText: z.string() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("free_writing"),
    content: z.object({
      prompt: z.string(),
      minWords: z.number().int().positive().optional(),
      /** Sentence openers offered as help (mostly at the lower levels). */
      starters: z.array(z.string()).optional(),
    }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("reading_comprehension"),
    content: z.object({ passage: z.string(), question: z.string(), options: z.array(z.string()).optional() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("listening_comprehension"),
    content: z.object({ audioUrl: z.string(), question: z.string(), options: z.array(z.string()).optional() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("sentence_construction"),
    content: z.object({ words: z.array(z.string()), instructions: z.string().optional() }),
  }),
  z.object({
    ...exerciseBaseShape,
    exerciseType: z.literal("grammar_error_correction"),
    content: z.object({ sentenceWithError: z.string(), prompt: z.string().optional() }),
  }),
]);
export type ExercisePublic = z.infer<typeof exercisePublicSchema>;

/** Answer submission payloads accepted from the client, keyed by exercise type. */
export const exerciseResponseSchema = z.discriminatedUnion("exerciseType", [
  z.object({ exerciseType: z.literal("multiple_choice"), selectedOptionIndex: z.number().int().nonnegative() }),
  z.object({ exerciseType: z.literal("fill_in_blank"), answer: z.string().trim().min(1) }),
  z.object({ exerciseType: z.literal("translation_es_en"), answer: z.string().trim().min(1) }),
  z.object({ exerciseType: z.literal("translation_en_es"), answer: z.string().trim().min(1) }),
  z.object({ exerciseType: z.literal("free_writing"), answer: z.string().trim().min(1) }),
  // Ordered words are sent joined with spaces; both are corrected deterministically (no AI).
  z.object({ exerciseType: z.literal("word_ordering"), answer: z.string().trim().min(1) }),
  z.object({ exerciseType: z.literal("grammar_error_correction"), answer: z.string().trim().min(1) }),
]);
export type ExerciseResponse = z.infer<typeof exerciseResponseSchema>;
