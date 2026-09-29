export function buildWritingFeedbackUserPrompt(params: { exercisePrompt: string; studentAnswer: string }): string {
  return `Exercise prompt given to the student: "${params.exercisePrompt}"

Student's answer:
"""
${params.studentAnswer}
"""

Evaluate the student's answer following your instructions and return the JSON object described in the system prompt.`;
}
