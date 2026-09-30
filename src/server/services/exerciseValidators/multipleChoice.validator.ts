export interface MultipleChoiceAnswerKey {
  correctOptionIndex: number;
}

export function validateMultipleChoice(
  answerKey: MultipleChoiceAnswerKey,
  selectedOptionIndex: number,
): { isCorrect: boolean; score: number } {
  const isCorrect = selectedOptionIndex === answerKey.correctOptionIndex;
  return { isCorrect, score: isCorrect ? 100 : 0 };
}
