/**
 * Picks what to review for day N straight from stored data (exercise_attempts + the exercises they belong to):
 * the mistakes of day N-1 plus a couple of items each from N-3 and N-7 (spaced repetition). No AI is used to
 * decide WHAT was failed; the AI only turns these items into fresh exercises.
 */
export const REVIEW_OFFSETS = [1, 3, 7] as const;
export const REVIEW_LIMITS: Record<(typeof REVIEW_OFFSETS)[number], number> = { 1: 6, 3: 2, 7: 2 };
const MAX_WEAK_VOCABULARY = 8;
const MAX_TEXT_LENGTH = 220;

export interface HistoricExercise {
  id: string;
  dayNumber: number;
  exerciseType: string;
  content: Record<string, unknown>;
  answerKey: Record<string, unknown>;
  /** Vocabulary taught in the section this exercise belongs to. */
  sectionVocabulary: Array<{ term: string }>;
}

export interface HistoricAttempt {
  exerciseId: string;
  isCorrect: boolean | null;
  response: Record<string, unknown>;
  submittedAt: string;
}

export interface ReviewItem {
  /** Which earlier day it comes from, as an offset from the day being generated (1, 3 or 7). */
  daysAgo: number;
  exerciseType: string;
  question: string;
  studentAnswer?: string;
  expectedAnswer?: string;
}

export interface ReviewSelection {
  items: ReviewItem[];
  weakVocabulary: string[];
}

function clip(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > MAX_TEXT_LENGTH ? `${trimmed.slice(0, MAX_TEXT_LENGTH)}…` : trimmed;
}

/** Question, what the student answered and the expected answer for a closed-answer exercise (null for open ones). */
export function describeExercise(
  exercise: Pick<HistoricExercise, "exerciseType" | "content" | "answerKey">,
  response: Record<string, unknown>,
): Omit<ReviewItem, "daysAgo"> | null {
  const { content, answerKey } = exercise;
  const options = Array.isArray(content.options) ? (content.options as unknown[]) : [];

  switch (exercise.exerciseType) {
    case "multiple_choice": {
      const question = clip(content.prompt);
      if (!question) return null;
      const correctIndex = typeof answerKey.correctOptionIndex === "number" ? answerKey.correctOptionIndex : -1;
      const picked = typeof response.selectedOptionIndex === "number" ? response.selectedOptionIndex : -1;
      return {
        exerciseType: exercise.exerciseType,
        question,
        studentAnswer: clip(options[picked]),
        expectedAnswer: clip(options[correctIndex]),
      };
    }
    case "fill_in_blank": {
      const question = clip(content.prompt);
      if (!question) return null;
      const accepted = Array.isArray(answerKey.acceptedAnswers) ? (answerKey.acceptedAnswers as unknown[]) : [];
      return { exerciseType: exercise.exerciseType, question, studentAnswer: clip(response.answer), expectedAnswer: clip(accepted[0]) };
    }
    case "translation_es_en":
    case "translation_en_es": {
      const question = clip(content.sourceText);
      if (!question) return null;
      const accepted = Array.isArray(answerKey.acceptedAnswers) ? (answerKey.acceptedAnswers as unknown[]) : [];
      return { exerciseType: exercise.exerciseType, question, studentAnswer: clip(response.answer), expectedAnswer: clip(accepted[0]) };
    }
    default:
      return null; // free writing has no single expected answer to drill
  }
}

export function selectReviewItems(params: {
  dayNumber: number;
  exercises: HistoricExercise[];
  attempts: HistoricAttempt[];
}): ReviewSelection {
  const exerciseById = new Map(params.exercises.map((exercise) => [exercise.id, exercise]));

  // Latest attempt per exercise decides whether it still counts as an error.
  const latest = new Map<string, HistoricAttempt>();
  for (const attempt of params.attempts) {
    const current = latest.get(attempt.exerciseId);
    if (!current || attempt.submittedAt > current.submittedAt) latest.set(attempt.exerciseId, attempt);
  }

  const items: ReviewItem[] = [];
  const weakTerms = new Set<string>();

  for (const offset of REVIEW_OFFSETS) {
    const targetDay = params.dayNumber - offset;
    if (targetDay < 1) continue;

    let taken = 0;
    for (const [exerciseId, attempt] of latest) {
      if (taken >= REVIEW_LIMITS[offset]) break;
      if (attempt.isCorrect !== false) continue;
      const exercise = exerciseById.get(exerciseId);
      if (!exercise || exercise.dayNumber !== targetDay) continue;
      const described = describeExercise(exercise, attempt.response);
      if (!described) continue;

      items.push({ daysAgo: offset, ...described });
      taken += 1;

      const haystack = `${described.question} ${described.expectedAnswer ?? ""}`.toLowerCase();
      for (const { term } of exercise.sectionVocabulary) {
        if (term && haystack.includes(term.toLowerCase())) weakTerms.add(term);
      }
    }
  }

  return { items, weakVocabulary: Array.from(weakTerms).slice(0, MAX_WEAK_VOCABULARY) };
}

export function describeReviewItems(selection: ReviewSelection): string {
  if (selection.items.length === 0) return "";
  const lines = selection.items.map((item, index) => {
    const parts = [`${index + 1}. [${item.daysAgo === 1 ? "yesterday" : `${item.daysAgo} days ago`}, ${item.exerciseType}] ${item.question}`];
    if (item.studentAnswer) parts.push(`student answered: "${item.studentAnswer}"`);
    if (item.expectedAnswer) parts.push(`correct: "${item.expectedAnswer}"`);
    return parts.join(" — ");
  });
  return lines.join("\n");
}
