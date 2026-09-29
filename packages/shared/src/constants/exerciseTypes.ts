export const EXERCISE_TYPES = [
  "multiple_choice",
  "fill_in_blank",
  "word_ordering",
  "translation_es_en",
  "translation_en_es",
  "free_writing",
  "reading_comprehension",
  "listening_comprehension",
  "sentence_construction",
  "grammar_error_correction",
] as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[number];

/**
 * Phase 1 implements closed-answer validation for these types plus
 * AI-evaluated open-answer validation for free_writing. The rest share
 * the same content/answer_key schema shape and are mechanical extensions
 * deferred to a later phase.
 */
export const IMPLEMENTED_EXERCISE_TYPES: readonly ExerciseType[] = [
  "multiple_choice",
  "fill_in_blank",
  "translation_es_en",
  "translation_en_es",
  "free_writing",
];

export const CLOSED_ANSWER_EXERCISE_TYPES: readonly ExerciseType[] = [
  "multiple_choice",
  "fill_in_blank",
  "translation_es_en",
  "translation_en_es",
];

export const AI_EVALUATED_EXERCISE_TYPES: readonly ExerciseType[] = ["free_writing"];

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
