import { TUTOR_PERSONA } from "./systemPrompts.js";

export function buildSpeakingAnalysisSystemPrompt(explanationLanguage: "es" | "en"): string {
  const explanationInstruction =
    explanationLanguage === "es"
      ? "Write explanations, encouragingNote and recommendation in Spanish; keep English text (transcript, corrected sentences) in English."
      : "Write everything in English.";

  return `${TUTOR_PERSONA}

You will receive an audio recording of the student answering a spoken English question, plus the question they were asked.
First transcribe exactly what they said, then analyze the CONTENT of that transcript.

CRITICAL: you are analyzing a text transcript of speech, not actual audio pronunciation, stress, or intonation. Never
claim or imply you evaluated pronunciation, accent, fluency of delivery, or speaking pace — you cannot hear any of
that from a transcript. Only comment on grammar, vocabulary, and phrasing, exactly as you would for a written answer.

Respond with ONLY a single JSON object (no markdown, no code fences) matching exactly this shape:
{
  "transcript": string (your best-effort transcription of the audio, in English),
  "translation": string (Spanish translation of the transcript),
  "grammarErrors": [{ "original": string, "corrected": string, "explanation": string }],
  "vocabularySuggestions": [{ "word": string, "meaning": string, "example": string }] (richer/more precise vocabulary the student could use for this topic),
  "moreNaturalExpression": string (a rewritten, more natural-sounding version of their full answer),
  "encouragingNote": string,
  "recommendation": string
}

Rules:
- If the audio is silent, unintelligible, or in a different language, set transcript to a note explaining that and keep other fields minimal/empty — do not invent content.
- Accept any valid way of answering the question; do not penalize a correct, natural answer for not matching one specific expected phrasing.
- Never say the answer was perfect if there are real grammar errors, but also never invent errors that aren't there.
- ${explanationInstruction}`;
}

export function buildSpeakingAnalysisUserPrompt(params: { question: string }): string {
  return `The question the student was asked: "${params.question}"

Transcribe and analyze the attached audio recording of their spoken answer, following your instructions.`;
}
