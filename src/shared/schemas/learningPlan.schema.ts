import { z } from "zod";
import { CEFR_LEVELS } from "../constants/exerciseTypes";
import { FOCUS_AREAS } from "../constants/focusAreas";
import { INTERESTS, MAIN_GOALS } from "../constants/personalization";

export const planDayTypeSchema = z.enum(["lesson", "review", "rest", "assessment"]);
export type PlanDayType = z.infer<typeof planDayTypeSchema>;

export const planDayStatusSchema = z.enum(["locked", "available", "completed"]);
export type PlanDayStatus = z.infer<typeof planDayStatusSchema>;

export const lessonGenerationStatusSchema = z.enum(["pending", "generating", "ready", "failed"]);
export type LessonGenerationStatus = z.infer<typeof lessonGenerationStatusSchema>;

export const planDaySchema = z.object({
  id: z.string().uuid(),
  learningPlanId: z.string().uuid(),
  dayNumber: z.number().int().min(1).max(90),
  weekNumber: z.number().int().min(1),
  dayType: planDayTypeSchema,
  lessonId: z.string().uuid().nullable(),
  status: planDayStatusSchema,
  unlockedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  theme: z.string().nullable(),
  generationStatus: lessonGenerationStatusSchema,
});
export type PlanDay = z.infer<typeof planDaySchema>;

export const learningPlanStatusSchema = z.enum(["active", "completed", "archived"]);
export type LearningPlanStatus = z.infer<typeof learningPlanStatusSchema>;

/**
 * What the lesson engine knows about the student's context, stored per plan (learning_plans.personalization).
 * Every field except focusAreas/minutesPerSession is optional: nothing is invented when the student skipped it.
 */
export const planPersonalizationSchema = z.object({
  profession: z.string().trim().min(1).max(120).optional(),
  interests: z.array(z.enum(INTERESTS)).default([]),
  otherInterests: z.string().trim().min(1).max(200).optional(),
  primaryGoal: z.enum(MAIN_GOALS).optional(),
  focusAreas: z.array(z.enum(FOCUS_AREAS)).default([]),
  minutesPerSession: z.number().int().min(10).max(240),
});
export type PlanPersonalization = z.infer<typeof planPersonalizationSchema>;

export const learningPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: learningPlanStatusSchema,
  totalDays: z.number().int().positive(),
  startDate: z.string(),
  targetLevelStart: z.enum(CEFR_LEVELS).nullable(),
  targetLevelEnd: z.enum(CEFR_LEVELS).nullable(),
  generatedBy: z.enum(["ai", "manual", "template"]),
  personalization: planPersonalizationSchema.nullable(),
});
export type LearningPlan = z.infer<typeof learningPlanSchema>;

export const currentLearningPlanResponseSchema = z.object({
  plan: learningPlanSchema.nullable(),
  days: z.array(planDaySchema),
});
export type CurrentLearningPlanResponse = z.infer<typeof currentLearningPlanResponseSchema>;

export const learningPlanSummarySchema = learningPlanSchema.extend({
  isCurrent: z.boolean(),
  completedDays: z.number().int().min(0),
  createdAt: z.string(),
});
export type LearningPlanSummary = z.infer<typeof learningPlanSummarySchema>;

export const learningPlanListResponseSchema = z.object({
  plans: z.array(learningPlanSummarySchema),
});
export type LearningPlanListResponse = z.infer<typeof learningPlanListResponseSchema>;

/** Max simultaneous non-archived plans per user (each one costs an AI generation). */
export const MAX_OPEN_PLANS = 5;

const CEFR_ORDER = new Map(CEFR_LEVELS.map((level, index) => [level, index]));

export const generatePlanRequestSchema = z
  .object({
    // About the student — used to personalize themes, vocabulary and examples.
    // Optional: when left empty the lessons simply do not assume any profession.
    occupation: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length >= 2 ? value : undefined)),
    interests: z.array(z.enum(INTERESTS)).max(INTERESTS.length),
    otherInterests: z.string().trim().max(200).optional(),
    mainGoal: z.enum(MAIN_GOALS),
    // Levels and schedule.
    currentLevel: z.enum(CEFR_LEVELS),
    targetLevel: z.enum(CEFR_LEVELS),
    dailyMinutesGoal: z.number().int().min(10).max(240).default(60),
    focusAreas: z.array(z.enum(FOCUS_AREAS)).min(1, "Elegí al menos un área de enfoque"),
    motivation: z.string().trim().max(500).optional(),
  })
  .refine((data) => (CEFR_ORDER.get(data.targetLevel) ?? 0) >= (CEFR_ORDER.get(data.currentLevel) ?? 0), {
    message: "El nivel objetivo no puede ser menor que tu nivel actual",
    path: ["targetLevel"],
  });
export type GeneratePlanRequest = z.infer<typeof generatePlanRequestSchema>;

export const learningGoalsSchema = z.object({
  id: z.string().uuid(),
  targetLevel: z.enum(CEFR_LEVELS).nullable(),
  focusAreas: z.array(z.string()),
  dailyMinutesGoal: z.number().int().positive(),
  motivation: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
});
export type LearningGoals = z.infer<typeof learningGoalsSchema>;
