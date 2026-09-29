import type { SupabaseClient } from "@supabase/supabase-js";
import { writingFeedbackSchema, type ExerciseAttemptResult, type ExerciseResponse } from "@myenglishjourney/shared";
import { AppError, BudgetExceededError } from "../utils/AppError.js";
import { exerciseRepository } from "../repositories/exercise.repository.js";
import { exerciseAttemptRepository } from "../repositories/exerciseAttempt.repository.js";
import { profileRepository } from "../repositories/profile.repository.js";
import { validateMultipleChoice, type MultipleChoiceAnswerKey } from "./exerciseValidators/multipleChoice.validator.js";
import { validateFillInBlank, type ClosedTextAnswerKey } from "./exerciseValidators/fillInBlank.validator.js";
import { validateTranslation } from "./exerciseValidators/translation.validator.js";
import { aiRouter, buildWritingFeedbackSystemPrompt, buildWritingFeedbackUserPrompt } from "./ai/index.js";
import { AIProviderFailureError } from "./ai/AIRouter.js";
import { logger } from "../utils/logger.js";

export const exerciseService = {
  async submitAttempt(
    supabase: SupabaseClient,
    userId: string,
    exerciseId: string,
    response: ExerciseResponse,
  ): Promise<ExerciseAttemptResult> {
    const exercise = await exerciseRepository.getByIdForUser(supabase, userId, exerciseId);

    if (exercise.exercise_type !== response.exerciseType) {
      throw new AppError(
        `El ejercicio es de tipo "${exercise.exercise_type}" pero la respuesta indica "${response.exerciseType}"`,
        400,
        "exercise_type_mismatch",
      );
    }

    const attemptNumber = await exerciseAttemptRepository.getNextAttemptNumber(supabase, exerciseId, userId);

    let isCorrect: boolean | null = null;
    let score: number | null = null;
    let aiFeedback: Record<string, unknown> | null = null;
    let evaluationStatus: "auto_correct" | "auto_incorrect" | "ai_evaluated" | "error";

    switch (response.exerciseType) {
      case "multiple_choice": {
        const result = validateMultipleChoice(exercise.answer_key as unknown as MultipleChoiceAnswerKey, response.selectedOptionIndex);
        isCorrect = result.isCorrect;
        score = result.score;
        evaluationStatus = result.isCorrect ? "auto_correct" : "auto_incorrect";
        break;
      }
      case "fill_in_blank": {
        const result = validateFillInBlank(exercise.answer_key as unknown as ClosedTextAnswerKey, response.answer);
        isCorrect = result.isCorrect;
        score = result.score;
        evaluationStatus = result.isCorrect ? "auto_correct" : "auto_incorrect";
        break;
      }
      case "translation_es_en":
      case "translation_en_es": {
        const result = validateTranslation(exercise.answer_key as unknown as ClosedTextAnswerKey, response.answer);
        isCorrect = result.isCorrect;
        score = result.score;
        evaluationStatus = result.isCorrect ? "auto_correct" : "auto_incorrect";
        break;
      }
      case "free_writing": {
        try {
          const profile = await profileRepository.getById(supabase, userId);
          const explanationLanguage = profile.explanation_language;
          const exerciseContent = exercise.content as { prompt: string };

          const result = await aiRouter.generate(supabase, {
            activityType: "writing_feedback",
            systemPrompt: buildWritingFeedbackSystemPrompt(explanationLanguage),
            userPrompt: buildWritingFeedbackUserPrompt({ exercisePrompt: exerciseContent.prompt, studentAnswer: response.answer }),
            responseSchema: writingFeedbackSchema,
            userId,
          });

          isCorrect = result.data.isAcceptable;
          score = result.data.score;
          aiFeedback = result.data;
          evaluationStatus = "ai_evaluated";
        } catch (error) {
          // Never lose the student's submission just because AI evaluation failed —
          // persist the attempt with evaluation_status "error" and let them retry later.
          if (error instanceof AIProviderFailureError || error instanceof BudgetExceededError) {
            logger.warn({ err: error, exerciseId, userId }, "AI evaluation failed for free_writing attempt");
            evaluationStatus = "error";
          } else {
            throw error;
          }
        }
        break;
      }
      default:
        throw new AppError("Tipo de ejercicio no soportado todavía", 400, "exercise_type_not_implemented");
    }

    const attempt = await exerciseAttemptRepository.insert(supabase, {
      userId,
      exerciseId,
      attemptNumber,
      response: response as unknown as Record<string, unknown>,
      isCorrect,
      score,
      aiFeedback,
      evaluationStatus,
    });

    return {
      id: attempt.id,
      exerciseId: attempt.exercise_id,
      attemptNumber: attempt.attempt_number,
      isCorrect: attempt.is_correct,
      score: attempt.score,
      evaluationStatus: attempt.evaluation_status as ExerciseAttemptResult["evaluationStatus"],
      aiFeedback: attempt.ai_feedback as ExerciseAttemptResult["aiFeedback"],
      submittedAt: attempt.submitted_at,
    };
  },
};
