import type { CefrLevel, ExerciseType, PlanDayType } from "@myenglishjourney/shared";
import { getCefrRules } from "./cefrRules";

/**
 * Session length drives the amount of PRACTICE (exercises, vocabulary, writing, review), not the amount of
 * generated prose: 60 minutes means ~60 minutes of student interaction.
 */
export const SESSION_TIERS = [30, 45, 60, 90] as const;
export type SessionTier = (typeof SESSION_TIERS)[number];

interface TierConfig {
  sections: { min: number; max: number };
  exercises: { min: number; max: number };
  vocabulary: { min: number; max: number };
  freeWriting: { min: number; max: number };
  /** Exercises dedicated to reviewing earlier material (when there is history to review). */
  review: number;
}

export const TIER_CONFIG: Record<SessionTier, TierConfig> = {
  30: { sections: { min: 4, max: 6 }, exercises: { min: 10, max: 14 }, vocabulary: { min: 4, max: 6 }, freeWriting: { min: 0, max: 1 }, review: 3 },
  45: { sections: { min: 5, max: 7 }, exercises: { min: 15, max: 20 }, vocabulary: { min: 6, max: 8 }, freeWriting: { min: 0, max: 1 }, review: 4 },
  60: { sections: { min: 6, max: 8 }, exercises: { min: 20, max: 26 }, vocabulary: { min: 8, max: 12 }, freeWriting: { min: 1, max: 2 }, review: 5 },
  90: { sections: { min: 7, max: 9 }, exercises: { min: 30, max: 38 }, vocabulary: { min: 12, max: 16 }, freeWriting: { min: 1, max: 3 }, review: 7 },
};

/** Snap any configured minutes (10-240) to the closest supported tier. */
export function tierForMinutes(minutes: number): SessionTier {
  let best: SessionTier = SESSION_TIERS[0];
  for (const tier of SESSION_TIERS) {
    if (Math.abs(tier - minutes) < Math.abs(best - minutes)) best = tier;
  }
  return best;
}

export interface LessonSpec {
  tier: SessionTier;
  minutes: number;
  sections: { min: number; max: number };
  exercises: { min: number; max: number };
  vocabulary: { min: number; max: number };
  freeWriting: { min: number; max: number };
  /** Exercises that must live in the "review" section (0 when the lesson has no review section). */
  reviewExercises: number;
  requiredSections: string[];
  allowedSections: string[];
  dayType: PlanDayType;
}

const ALLOWED_SECTIONS = ["review", "vocabulary", "grammar", "interactive", "speaking", "final_assessment"];

export function buildLessonSpec(params: { minutes: number; level: CefrLevel; dayType: PlanDayType }): LessonSpec {
  const tier = tierForMinutes(params.minutes);
  const config = TIER_CONFIG[tier];
  const rules = getCefrRules(params.level);

  const vocabMax = Math.min(config.vocabulary.max, rules.maxNewWords);
  const vocabMin = Math.min(config.vocabulary.min, vocabMax);
  const writingMax = Math.min(config.freeWriting.max, rules.maxFreeWriting);
  const writingMin = Math.min(config.freeWriting.min, writingMax);

  const isReviewDay = params.dayType === "review";
  const isAssessmentDay = params.dayType === "assessment";

  const requiredSections = isAssessmentDay
    ? ["review", "interactive", "final_assessment"]
    : isReviewDay
      ? ["review", "interactive"]
      : ["review", "vocabulary", "grammar", "interactive"];
  if (tier >= 45 && !isAssessmentDay && !isReviewDay && writingMax > 0) requiredSections.push("speaking");

  return {
    tier,
    minutes: params.minutes,
    sections: config.sections,
    exercises: config.exercises,
    // Review and assessment days concentrate on practice; new vocabulary is optional there.
    vocabulary: isReviewDay || isAssessmentDay ? { min: 0, max: Math.min(vocabMax, 4) } : { min: vocabMin, max: vocabMax },
    freeWriting: { min: isReviewDay || isAssessmentDay ? 0 : writingMin, max: writingMax },
    reviewExercises: isReviewDay ? Math.ceil(config.exercises.min * 0.5) : config.review,
    requiredSections,
    allowedSections: ALLOWED_SECTIONS,
    dayType: params.dayType,
  };
}

/** Rough time a student needs per task, in seconds (reading + thinking + typing). */
const EXERCISE_SECONDS: Record<string, number> = {
  multiple_choice: 60,
  fill_in_blank: 75,
  translation_es_en: 120,
  translation_en_es: 120,
  free_writing: 420,
};
const VOCAB_ITEM_SECONDS = 45;
const EXPLANATION_SECONDS = 120;

export interface EstimableLesson {
  sections: Array<{
    explanation?: string | undefined;
    vocabulary?: unknown[] | undefined;
    exercises?: Array<{ exerciseType: ExerciseType | string }> | undefined;
  }>;
}

export function estimateLessonMinutes(lesson: EstimableLesson): number {
  let seconds = 0;
  for (const section of lesson.sections) {
    if (section.explanation) seconds += EXPLANATION_SECONDS;
    seconds += (section.vocabulary?.length ?? 0) * VOCAB_ITEM_SECONDS;
    for (const exercise of section.exercises ?? []) seconds += EXERCISE_SECONDS[exercise.exerciseType] ?? 75;
  }
  return Math.round(seconds / 60);
}

/** Accepted band for the estimated time relative to the target. */
export const DURATION_TOLERANCE = { min: 0.55, max: 1.45 } as const;
