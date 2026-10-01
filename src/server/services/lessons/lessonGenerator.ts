import type { SupabaseClient } from "@supabase/supabase-js";
import { aiRouter } from "../ai/index";
import { generatedLessonSchema, normalizeGeneratedLesson, type GeneratedLesson } from "../ai/planGeneration.schema";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { getCefrRules } from "./cefrRules";
import type { LearningContext } from "./learningContext";
import type { LessonSpec } from "./lessonDuration";
import { buildLessonSystemPrompt, buildLessonUserPrompt } from "./lessonPrompt";
import { allIssues, repairGeneratedLesson, validateGeneratedLesson } from "./lessonValidator";

/**
 * Hard cap on model calls for ONE lesson: first try, one repair try with the problems listed, and (only when the
 * OpenAI fallback is enabled) a last try on the other provider. The router already retries transient provider errors (and falls back to OpenAI) inside each
 * call, and the cap guarantees there is no regeneration loop.
 */
export const MAX_CONTENT_ATTEMPTS = 3;

/** The third try exists only to use the other provider, so without OpenAI it would just repeat Gemini. */
export const contentAttempts = (): number => (env.AI_OPENAI_FALLBACK_ENABLED ? MAX_CONTENT_ATTEMPTS : MAX_CONTENT_ATTEMPTS - 1);

export class LessonValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`La lección generada no cumple las reglas: ${issues.join(" | ")}`);
    this.name = "LessonValidationError";
  }
}

function maxTokensFor(spec: LessonSpec): number {
  return Math.min(12000, 2500 + spec.exercises.max * 180);
}

/**
 * Generates a lesson and only returns it when it has no HARD problems (missing sections, unusable exercises,
 * content the student did not choose, wrong language for the level...). Soft deviations — a few exercises more or
 * less, a slightly different length — are accepted and logged: they never justify spending another call.
 */
export async function generateValidLesson(params: {
  supabase: SupabaseClient;
  userId: string;
  context: LearningContext;
  spec: LessonSpec;
}): Promise<GeneratedLesson> {
  const { supabase, userId, context, spec } = params;
  const validation = { spec, rules: getCefrRules(context.cefrLevel), context };
  const systemPrompt = buildLessonSystemPrompt();

  let repairNotes: string[] | undefined;
  let lastHard: string[] = [];

  const attempts = contentAttempts();
  for (let attempt = 0; attempt < attempts; attempt++) {
    const result = await aiRouter.generate(supabase, {
      activityType: "lesson_generation",
      systemPrompt,
      userPrompt: buildLessonUserPrompt({ context, spec, repairNotes }),
      responseSchema: generatedLessonSchema,
      userId,
      temperature: 0.5,
      maxOutputTokens: maxTokensFor(spec),
      // Last resort: let the other provider have a go if the first one keeps missing the rules.
      ...(env.AI_OPENAI_FALLBACK_ENABLED && attempt === attempts - 1 ? { preferProvider: "openai" as const } : {}),
    });

    const lesson = repairGeneratedLesson(normalizeGeneratedLesson(result.data), validation);
    const found = validateGeneratedLesson(lesson, validation);

    if (found.hard.length === 0) {
      if (found.soft.length > 0) logger.info({ issues: found.soft, userId }, "Accepting lesson with minor deviations");
      return lesson;
    }

    lastHard = found.hard;
    repairNotes = allIssues(found);
    logger.warn({ attempt, issues: repairNotes, userId }, "Generated lesson failed validation");
  }

  throw new LessonValidationError(lastHard);
}
