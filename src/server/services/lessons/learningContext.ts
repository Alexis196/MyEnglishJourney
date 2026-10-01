import {
  FOCUS_AREAS,
  planPersonalizationSchema,
  type CefrLevel,
  type FocusArea,
  type Interest,
  type MainGoal,
  type PlanDayType,
  type PlanPersonalization,
} from "@myenglishjourney/shared";
import { NO_HISTORY_PERFORMANCE, type PerformanceSummary } from "./performance";
import type { ReviewSelection } from "./reviewSelection";

/**
 * Everything the lesson prompt is allowed to know about the student. Built only from data that exists in the
 * project; a field the student never provided stays undefined and is never invented.
 */
export interface LearningContext {
  cefrLevel: CefrLevel;
  explanationLanguage: "es" | "en";
  learningGoal?: MainGoal;
  interests: Interest[];
  otherInterests?: string;
  profession?: string;
  preferredTopics: FocusArea[];
  minutesPerLesson: number;
  performance: PerformanceSummary;
  review: ReviewSelection;
  dayNumber: number;
  totalDays: number;
  dayType: PlanDayType;
  theme?: string;
  previousLessonTitle?: string;
}

export const DEFAULT_MINUTES_PER_SESSION = 30;

interface GoalsLike {
  focus_areas?: string[] | null;
  daily_minutes_goal?: number | null;
}

/**
 * Plans created before the personalization column existed have none: fall back to what the account does have
 * (learning_goals) and otherwise neutral defaults — no interests, no profession.
 */
export function resolvePersonalization(stored: unknown, goals: GoalsLike | null): PlanPersonalization {
  const parsed = planPersonalizationSchema.safeParse(stored);
  if (parsed.success) return parsed.data;

  const focusAreas = (goals?.focus_areas ?? []).filter((area): area is FocusArea =>
    (FOCUS_AREAS as readonly string[]).includes(area),
  );
  return {
    interests: [],
    focusAreas,
    minutesPerSession: goals?.daily_minutes_goal ?? DEFAULT_MINUTES_PER_SESSION,
  };
}

const TECH_PROFESSION = /\b(develop|program|software|engineer|coder|devops|it\b|sistemas|desarroll|program|inform[aá]tic|ingenier)/i;

/** Technology/programming context is allowed only when the student's own data points to it. */
export function allowsTechContext(context: Pick<LearningContext, "interests" | "preferredTopics" | "profession" | "otherInterests">): boolean {
  if (context.interests.includes("technology")) return true;
  if (context.preferredTopics.includes("software_development")) return true;
  if (context.profession && TECH_PROFESSION.test(context.profession)) return true;
  if (context.otherInterests && TECH_PROFESSION.test(context.otherInterests)) return true;
  return false;
}

/** Workplace scenarios are allowed only with a profession, a work-related focus area or a career goal. */
export function allowsWorkContext(context: Pick<LearningContext, "preferredTopics" | "profession" | "learningGoal">): boolean {
  if (context.profession) return true;
  if (context.learningGoal === "career" || context.learningGoal === "job_search") return true;
  return context.preferredTopics.some((topic) =>
    ["remote_work", "work_meetings", "job_interviews", "coworker_communication", "software_development"].includes(topic),
  );
}

export function emptyContextDefaults(): Pick<LearningContext, "performance" | "review"> {
  return { performance: NO_HISTORY_PERFORMANCE, review: { items: [], weakVocabulary: [] } };
}
