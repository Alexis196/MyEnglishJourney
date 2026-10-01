/**
 * Pedagogical stage of a lesson section. The lesson blueprint (server) walks the student through them in order:
 * recognise -> understand/practise -> build -> produce -> show it with less help.
 * Stored inside lesson_sections.content, so older lessons simply do not have one.
 */
export const LESSON_STAGES = ["recognition", "guided", "construction", "production", "assessment"] as const;
export type LessonStage = (typeof LESSON_STAGES)[number];

export const LESSON_STAGE_LABELS: Record<LessonStage, string> = {
  recognition: "Reconocimiento",
  guided: "Práctica guiada",
  construction: "Construcción",
  production: "Producción escrita",
  assessment: "Evaluación",
};

export const EXERCISE_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type ExerciseDifficulty = (typeof EXERCISE_DIFFICULTIES)[number];
