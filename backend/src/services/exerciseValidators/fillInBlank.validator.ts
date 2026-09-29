import { matchesAnyAcceptedAnswer } from "./normalizeAnswer.js";

export interface ClosedTextAnswerKey {
  acceptedAnswers: string[];
}

export function validateFillInBlank(answerKey: ClosedTextAnswerKey, answer: string): { isCorrect: boolean; score: number } {
  const isCorrect = matchesAnyAcceptedAnswer(answer, answerKey.acceptedAnswers);
  return { isCorrect, score: isCorrect ? 100 : 0 };
}
