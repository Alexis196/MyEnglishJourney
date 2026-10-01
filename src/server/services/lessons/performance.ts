/**
 * Adaptive difficulty. Looks only at the student's recent results (never a single activity) and only tunes
 * support and challenge INSIDE the CEFR level they chose — the level itself is never changed here.
 */
export const SKILLS = ["grammar", "vocabulary", "translation", "writing", "speaking"] as const;
export type Skill = (typeof SKILLS)[number];

export interface AttemptSample {
  exerciseId: string;
  isCorrect: boolean | null;
  exerciseType: string;
  sectionType: string | null;
}

export type DifficultyMode = "reinforce" | "steady" | "challenge";

export interface SkillStat {
  attempts: number;
  accuracy: number;
}

export interface PerformanceSummary {
  attempts: number;
  accuracy: number | null;
  bySkill: Partial<Record<Skill, SkillStat>>;
  weakSkills: Skill[];
  strongSkills: Skill[];
  mode: DifficultyMode;
}

export const PERFORMANCE_THRESHOLDS = {
  /** Below this overall accuracy (with enough data) the lesson reinforces. */
  reinforceBelow: 0.6,
  /** At/above this overall accuracy, held over enough attempts, the lesson adds challenge. */
  challengeFrom: 0.88,
  minAttemptsForMode: 15,
  minAttemptsForSkill: 5,
  weakSkillBelow: 0.6,
  strongSkillFrom: 0.88,
} as const;

/** Which skill an attempt exercises, from its section and exercise type. */
export function skillOf(sectionType: string | null, exerciseType: string): Skill {
  if (exerciseType === "free_writing") return sectionType === "speaking" ? "speaking" : "writing";
  if (exerciseType === "translation_es_en" || exerciseType === "translation_en_es") return "translation";
  if (sectionType === "vocabulary") return "vocabulary";
  return "grammar";
}

export function computePerformance(samples: AttemptSample[]): PerformanceSummary {
  // Newest first: keep only the latest result of each exercise so retries do not count twice.
  const seen = new Set<string>();
  const graded: AttemptSample[] = [];
  for (const sample of samples) {
    if (sample.isCorrect === null || seen.has(sample.exerciseId)) continue;
    seen.add(sample.exerciseId);
    graded.push(sample);
  }

  const totals = new Map<Skill, { attempts: number; correct: number }>();
  let correct = 0;
  for (const sample of graded) {
    if (sample.isCorrect) correct += 1;
    const skill = skillOf(sample.sectionType, sample.exerciseType);
    const entry = totals.get(skill) ?? { attempts: 0, correct: 0 };
    entry.attempts += 1;
    if (sample.isCorrect) entry.correct += 1;
    totals.set(skill, entry);
  }

  const bySkill: Partial<Record<Skill, SkillStat>> = {};
  const weakSkills: Skill[] = [];
  const strongSkills: Skill[] = [];
  for (const [skill, entry] of totals) {
    const accuracy = entry.correct / entry.attempts;
    bySkill[skill] = { attempts: entry.attempts, accuracy };
    if (entry.attempts >= PERFORMANCE_THRESHOLDS.minAttemptsForSkill) {
      if (accuracy < PERFORMANCE_THRESHOLDS.weakSkillBelow) weakSkills.push(skill);
      else if (accuracy >= PERFORMANCE_THRESHOLDS.strongSkillFrom) strongSkills.push(skill);
    }
  }

  const attempts = graded.length;
  const accuracy = attempts > 0 ? correct / attempts : null;
  let mode: DifficultyMode = "steady";
  if (accuracy !== null && attempts >= PERFORMANCE_THRESHOLDS.minAttemptsForMode) {
    if (accuracy < PERFORMANCE_THRESHOLDS.reinforceBelow) mode = "reinforce";
    else if (accuracy >= PERFORMANCE_THRESHOLDS.challengeFrom) mode = "challenge";
  }

  return { attempts, accuracy, bySkill, weakSkills, strongSkills, mode };
}

export const NO_HISTORY_PERFORMANCE: PerformanceSummary = {
  attempts: 0,
  accuracy: null,
  bySkill: {},
  weakSkills: [],
  strongSkills: [],
  mode: "steady",
};

const MODE_GUIDANCE: Record<DifficultyMode, string> = {
  reinforce:
    "Recent results are low: use simpler examples, add hints/model answers, repeat the key pattern in new contexts and keep new vocabulary at the low end of the range.",
  steady: "Recent results are normal: keep the standard difficulty for the level.",
  challenge:
    "Recent results are consistently high: reduce hints, use slightly richer examples and add one stretch task, still strictly within the level.",
};

export function describePerformance(summary: PerformanceSummary): string {
  const lines = [`Adaptive mode: ${summary.mode}. ${MODE_GUIDANCE[summary.mode]}`];
  if (summary.accuracy !== null) {
    lines.push(`Recent accuracy: ${Math.round(summary.accuracy * 100)}% over ${summary.attempts} exercises.`);
  }
  if (summary.weakSkills.length > 0) lines.push(`Needs reinforcement: ${summary.weakSkills.join(", ")}.`);
  if (summary.strongSkills.length > 0) lines.push(`Strong: ${summary.strongSkills.join(", ")}.`);
  return lines.join("\n");
}
