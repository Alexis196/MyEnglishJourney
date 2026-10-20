import { z } from "zod";

export const vocabularySourceSchema = z.enum(["manual", "text", "lesson", "live", "speaking"]);
export type VocabularySource = z.infer<typeof vocabularySourceSchema>;

export const learningStatusSchema = z.enum(["pending", "learned", "difficult"]);
export type LearningStatus = z.infer<typeof learningStatusSchema>;

export const savedWordSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  translation: z.string(),
  exampleSentence: z.string().nullable(),
  category: z.string().nullable(),
  learningStatus: learningStatusSchema,
  source: vocabularySourceSchema,
  createdAt: z.string(),
  review: z.object({
    nextReviewAt: z.string(),
    intervalDays: z.number().int(),
    repetitions: z.number().int(),
    lastGrade: z.number().int().nullable(),
    due: z.boolean(),
  }),
});
export type SavedWord = z.infer<typeof savedWordSchema>;

export const vocabularyStatsSchema = z.object({
  total: z.number().int(),
  pending: z.number().int(),
  learned: z.number().int(),
  difficult: z.number().int(),
  due: z.number().int(),
});
export type VocabularyStats = z.infer<typeof vocabularyStatsSchema>;

export const vocabularyListResponseSchema = z.object({
  items: z.array(savedWordSchema),
  stats: vocabularyStatsSchema,
});
export type VocabularyListResponse = z.infer<typeof vocabularyListResponseSchema>;

const termField = z.string().trim().min(1, "Escribí una palabra o frase").max(80);

export const createVocabularySchema = z.object({
  term: termField,
  translation: z.string().trim().min(1, "Falta la traducción").max(200),
  exampleSentence: z.string().trim().max(300).optional(),
  category: z.string().trim().max(40).optional(),
  source: vocabularySourceSchema.default("manual"),
  sourceLessonId: z.string().uuid().optional(),
});
export type CreateVocabularyInput = z.infer<typeof createVocabularySchema>;

export const createVocabularyResponseSchema = z.object({
  item: savedWordSchema,
  /** False when the word was already saved: the existing one is returned untouched. */
  created: z.boolean(),
});
export type CreateVocabularyResponse = z.infer<typeof createVocabularyResponseSchema>;

export const updateVocabularySchema = z
  .object({
    translation: z.string().trim().min(1).max(200),
    exampleSentence: z.string().trim().max(300).nullable(),
    category: z.string().trim().max(40).nullable(),
    learningStatus: learningStatusSchema,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "No hay cambios para guardar" });
export type UpdateVocabularyInput = z.infer<typeof updateVocabularySchema>;

/** The AI completes a word the student typed (in English or in Spanish). */
export const enrichVocabularySchema = z.object({ term: termField });
export type EnrichVocabularyInput = z.infer<typeof enrichVocabularySchema>;

export const enrichedWordSchema = z.object({
  /** The English word or phrase (translated when the student typed it in Spanish). */
  term: z.string(),
  translation: z.string(),
  exampleSentence: z.string(),
  category: z.string(),
});
export type EnrichedWord = z.infer<typeof enrichedWordSchema>;

export const detectVocabularySchema = z.object({
  text: z.string().trim().min(15, "Pegá un texto un poco más largo").max(2000),
});
export type DetectVocabularyInput = z.infer<typeof detectVocabularySchema>;

export const detectedWordSchema = z.object({
  term: z.string(),
  translation: z.string(),
  exampleSentence: z.string(),
  category: z.string(),
});
export type DetectedWord = z.infer<typeof detectedWordSchema>;

export const detectVocabularyResponseSchema = z.object({
  words: z.array(detectedWordSchema),
  /** Words found that the student already had saved (not offered again). */
  alreadySaved: z.number().int(),
});
export type DetectVocabularyResponse = z.infer<typeof detectVocabularyResponseSchema>;

export const reviewGradeSchema = z.object({ grade: z.enum(["again", "hard", "good", "easy"]) });
export type ReviewGradeInput = z.infer<typeof reviewGradeSchema>;

export const vocabularyReviewQueueSchema = z.object({
  items: z.array(savedWordSchema),
  /** Total waiting, including those beyond this batch. */
  dueTotal: z.number().int(),
});
export type VocabularyReviewQueue = z.infer<typeof vocabularyReviewQueueSchema>;
