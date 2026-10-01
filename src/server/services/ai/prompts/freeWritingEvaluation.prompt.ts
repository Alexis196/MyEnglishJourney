export function buildWritingFeedbackUserPrompt(params: { exercisePrompt: string; studentAnswer: string; level?: string | null; minWords?: number }): string {
  const levelNote = params.level
    ? `
The student's CEFR level is ${params.level}. Judge the answer against what is expected at that level: at A1/A2 a few short, correct, simple sentences are a good answer — do not penalise it for lacking complexity, length or advanced vocabulary, and only flag mistakes that matter at that level.${params.minWords ? ` The task asked for about ${params.minWords} words or more.` : ""}
`
    : "";
  return `Exercise prompt given to the student: "${params.exercisePrompt}"${levelNote}

Student's answer:
"""
${params.studentAnswer}
"""

Evaluate the student's answer following your instructions and return the JSON object described in the system prompt.`;
}
