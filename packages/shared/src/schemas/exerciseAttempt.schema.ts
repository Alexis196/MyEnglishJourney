import { z } from "zod";
import { exerciseResponseSchema } from "./exercise.schema.js";
import { writingFeedbackSchema } from "./ai.schema.js";

export const evaluationStatusSchema = z.enum([
  "auto_correct",
  "auto_incorrect",
  "ai_pending",
  "ai_evaluated",
  "error",
]);
export type EvaluationStatus = z.infer<typeof evaluationStatusSchema>;

export const submitExerciseAttemptSchema = z.object({
  response: exerciseResponseSchema,
});
export type SubmitExerciseAttemptInput = z.infer<typeof submitExerciseAttemptSchema>;

export const exerciseAttemptResultSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  attemptNumber: z.number().int().positive(),
  isCorrect: z.boolean().nullable(),
  score: z.number().min(0).max(100).nullable(),
  evaluationStatus: evaluationStatusSchema,
  aiFeedback: writingFeedbackSchema.nullable(),
  submittedAt: z.string(),
});
export type ExerciseAttemptResult = z.infer<typeof exerciseAttemptResultSchema>;
