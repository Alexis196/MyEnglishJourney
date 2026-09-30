import { TUTOR_PERSONA } from "./systemPrompts";
import type { FocusArea } from "@myenglishjourney/shared";

export function buildPlanGenerationSystemPrompt(explanationLanguage: "es" | "en"): string {
  const explanationInstruction =
    explanationLanguage === "es"
      ? "Write titles, objectives, explanations and themes in a mix of English (the target language content) with brief Spanish scaffolding where it helps comprehension, exactly like a bilingual tutor would."
      : "Write everything in English.";

  return `${TUTOR_PERSONA}

You are designing a 90-day structured English learning plan (~60 minutes/day) for this student.
Respond with ONLY a single JSON object (no markdown, no code fences) matching exactly this shape:

{
  "planTitle": string,
  "targetLevelEnd": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "days": [
    { "dayNumber": number (1-90, every day must appear exactly once, in order), "dayType": "lesson" | "review" | "rest" | "assessment", "theme": string (short, e.g. "Talking about your daily routine") }
  ],
  "firstLesson": {
    "title": string,
    "objective": string,
    "sections": [
      {
        "sectionType": "review" | "vocabulary" | "grammar" | "interactive" | "listening" | "speaking" | "final_assessment",
        "title": string,
        "explanation": string (only for vocabulary/grammar/review sections),
        "examples": string[] (optional),
        "vocabulary": [{ "term": string, "translation": string, "example": string }] (only for vocabulary sections),
        "exercises": [
          {
            "exerciseType": "multiple_choice" | "fill_in_blank" | "translation_es_en" | "translation_en_es" | "free_writing",
            "prompt": string (for multiple_choice, fill_in_blank, free_writing — omit for translation types),
            "options": string[] (only for multiple_choice, 3-4 options),
            "correctOptionIndex": number (only for multiple_choice, 0-based index into options),
            "sourceText": string (only for translation_es_en/translation_en_es — the text to translate),
            "acceptedAnswers": string[] (only for fill_in_blank/translation types — all naturally valid answers),
            "minWords": number (only for free_writing, e.g. 15-30)
          }
        ]
      }
    ]
  }
}

Rules:
- Roughly 1 in 7 days should be "review", 1 in 15 should be "assessment", and include a few "rest" days — the rest are "lesson".
- "days" must cover 1 through 90 with no gaps or duplicates, ordered by dayNumber.
- "firstLesson" is for day 1 specifically: 3-5 sections following the spec's structure (review/vocabulary/grammar/interactive/listening/speaking as appropriate for day 1), each interactive/grammar/vocabulary section should include 1-2 exercises.
- Prioritize vocabulary and scenarios for: personal introductions, daily routines, remote work, software development, work meetings, job interviews, coworker communication, and everyday conversation — especially the areas the student selected.
- Keep exercises unambiguous: for translation/fill-in-blank, "acceptedAnswers" must list every natural phrasing you'd accept, not just one literal string.
- ${explanationInstruction}`;
}

const FOCUS_AREA_DESCRIPTIONS: Record<FocusArea, string> = {
  personal_introductions: "personal introductions",
  daily_routines: "daily routines",
  remote_work: "remote work",
  software_development: "software development",
  work_meetings: "work meetings",
  job_interviews: "job interviews",
  coworker_communication: "communication with coworkers",
  everyday_conversation: "everyday conversation",
};

export function buildPlanGenerationUserPrompt(params: {
  currentLevel: string;
  targetLevel: string;
  dailyMinutesGoal: number;
  focusAreas: FocusArea[];
  motivation?: string;
}): string {
  const focusList = params.focusAreas.map((f) => FOCUS_AREA_DESCRIPTIONS[f]).join(", ");
  return `Student profile:
- Current estimated level: ${params.currentLevel}
- Target level by day 90: ${params.targetLevel}
- Available study time: ~${params.dailyMinutesGoal} minutes/day
- Priority focus areas: ${focusList}
${params.motivation ? `- Motivation: ${params.motivation}` : ""}

Generate the 90-day plan skeleton and day 1's full lesson now, following the JSON contract in your instructions.`;
}
