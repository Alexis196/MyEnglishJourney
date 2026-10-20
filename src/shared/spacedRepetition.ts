import type { LearningStatus, ReviewGradeInput } from "./schemas/vocabulary.schema";

/**
 * Spaced repetition (SM-2 style). The student answers "again / hard / good / easy"; the next review is scheduled
 * further away each time they remember a word, and comes back soon when they forget it.
 */
export type Grade = ReviewGradeInput["grade"];

/** SM-2 quality scores (0-5) for each button. Anything below 3 counts as forgotten. */
const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

/** A word whose next review is this far away is considered learned. */
export const LEARNED_INTERVAL_DAYS = 21;
const MIN_EASE = 1.3;
/** Forgotten words come back in the same study session, not tomorrow. */
const RELEARN_MINUTES = 10;

export interface ReviewState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface ReviewResult extends ReviewState {
  nextReviewAt: Date;
  quality: number;
  learningStatus: LearningStatus;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scheduleReview(state: ReviewState, grade: Grade, previousStatus: LearningStatus, now = new Date()): ReviewResult {
  const quality = QUALITY[grade];
  const easeFactor = Math.max(MIN_EASE, round2(state.easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    return {
      easeFactor,
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: new Date(now.getTime() + RELEARN_MINUTES * 60_000),
      quality,
      learningStatus: "difficult",
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) intervalDays = grade === "easy" ? 3 : 1;
  else if (repetitions === 2) intervalDays = grade === "easy" ? 6 : 3;
  else {
    const factor = grade === "hard" ? 1.2 : grade === "easy" ? easeFactor * 1.3 : easeFactor;
    intervalDays = Math.max(state.intervalDays + 1, Math.round(state.intervalDays * factor));
  }

  const learningStatus: LearningStatus =
    intervalDays >= LEARNED_INTERVAL_DAYS ? "learned" : previousStatus === "difficult" && grade === "hard" ? "difficult" : "pending";

  return {
    easeFactor,
    intervalDays,
    repetitions,
    nextReviewAt: new Date(now.getTime() + intervalDays * 86_400_000),
    quality,
    learningStatus,
  };
}

/** How long until the word comes back for each button, as the card shows it. */
export function previewIntervals(state: ReviewState, previousStatus: LearningStatus): Record<Grade, string> {
  const labels = {} as Record<Grade, string>;
  for (const grade of Object.keys(QUALITY) as Grade[]) {
    const result = scheduleReview(state, grade, previousStatus);
    labels[grade] = result.quality < 3 ? "10 min" : result.intervalDays === 1 ? "1 día" : `${result.intervalDays} días`;
  }
  return labels;
}
