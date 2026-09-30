/** Case/whitespace/punctuation-insensitive comparison so trivial formatting differences don't fail a correct answer. */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,!?¿¡'"]/g, "")
    .replace(/\s+/g, " ");
}

export function matchesAnyAcceptedAnswer(answer: string, acceptedAnswers: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  return acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalized);
}
