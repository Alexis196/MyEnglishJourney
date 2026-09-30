import { matchesAnyAcceptedAnswer } from "./normalizeAnswer";
import type { ClosedTextAnswerKey } from "./fillInBlank.validator";

export function validateTranslation(answerKey: ClosedTextAnswerKey, answer: string): { isCorrect: boolean; score: number } {
  const isCorrect = matchesAnyAcceptedAnswer(answer, answerKey.acceptedAnswers);
  return { isCorrect, score: isCorrect ? 100 : 0 };
}
