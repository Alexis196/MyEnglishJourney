import type { CreateExerciseInput } from "../../repositories/exercise.repository";
import type { AIExercise } from "../ai/planGeneration.schema";
import { normalizeAnswer } from "../exerciseValidators/normalizeAnswer";

export type ExerciseInsertFields = Omit<CreateExerciseInput, "userId" | "lessonSectionId">;

const tokens = (text: string): string[] => normalizeAnswer(text).split(" ").filter(Boolean);

/** Same multiset of words (ignoring case/punctuation), so the scrambled bank can rebuild the answer. */
export function sameWords(words: string[], sentence: string): boolean {
  const a = words.flatMap((word) => tokens(word)).sort();
  const b = tokens(sentence).sort();
  return a.length === b.length && a.every((word, i) => word === b[i]);
}

/** Deterministic scramble that never hands back the answer order (so the bank is not the solution). */
export function scrambleWords(words: string[], seed: string): string[] {
  const answerOrder = words.join(" ");
  let state = [...seed].reduce((hash, ch) => (hash * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const shuffled = [...words];
  for (let attempt = 0; attempt < 6; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    if (shuffled.join(" ") !== answerOrder) return shuffled;
  }
  return [...words].reverse();
}

/** Maps a model exercise to the DB shape (public content + server-only answer key); null when it is unusable. */
export function toDbExercise(ai: AIExercise, orderIndex: number): ExerciseInsertFields | null {
  const difficulty = ai.difficulty;
  switch (ai.exerciseType) {
    case "multiple_choice": {
      if (!ai.prompt || !ai.options || ai.options.length < 2 || ai.correctOptionIndex === undefined) return null;
      if (ai.correctOptionIndex < 0 || ai.correctOptionIndex >= ai.options.length) return null;
      return {
        exerciseType: "multiple_choice",
        orderIndex,
        difficulty,
        content: { prompt: ai.prompt, options: ai.options },
        answerKey: { correctOptionIndex: ai.correctOptionIndex },
      };
    }
    case "fill_in_blank":
      if (!ai.prompt || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: "fill_in_blank",
        orderIndex,
        difficulty,
        content: { prompt: ai.prompt },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "translation_es_en":
    case "translation_en_es":
      if (!ai.sourceText || !ai.acceptedAnswers || ai.acceptedAnswers.length === 0) return null;
      return {
        exerciseType: ai.exerciseType,
        orderIndex,
        difficulty,
        content: { sourceText: ai.sourceText },
        answerKey: { acceptedAnswers: ai.acceptedAnswers },
      };
    case "word_ordering": {
      const answers = ai.acceptedAnswers ?? [];
      if (!ai.words || ai.words.length < 3 || answers.length === 0) return null;
      // Every accepted answer must be buildable from the bank, or the exercise could be unsolvable.
      if (!answers.every((answer) => sameWords(ai.words!, answer))) return null;
      return {
        exerciseType: "word_ordering",
        orderIndex,
        difficulty,
        content: { words: scrambleWords(ai.words, answers[0]!), ...(ai.prompt ? { prompt: ai.prompt } : {}) },
        answerKey: { acceptedAnswers: answers },
      };
    }
    case "grammar_error_correction": {
      const answers = ai.acceptedAnswers ?? [];
      if (!ai.sentenceWithError || answers.length === 0) return null;
      // The "corrected" version must actually differ from the faulty sentence.
      if (answers.some((answer) => normalizeAnswer(answer) === normalizeAnswer(ai.sentenceWithError!))) return null;
      return {
        exerciseType: "grammar_error_correction",
        orderIndex,
        difficulty,
        content: { sentenceWithError: ai.sentenceWithError, ...(ai.prompt ? { prompt: ai.prompt } : {}) },
        answerKey: { acceptedAnswers: answers },
      };
    }
    case "free_writing":
      if (!ai.prompt) return null;
      return {
        exerciseType: "free_writing",
        orderIndex,
        difficulty,
        content: {
          prompt: ai.prompt,
          ...(ai.minWords ? { minWords: ai.minWords } : {}),
          ...(ai.starters && ai.starters.length > 0 ? { starters: ai.starters } : {}),
        },
        answerKey: {},
      };
    default:
      return null;
  }
}
