import { z } from "zod";
import { CEFR_LEVELS } from "../constants/exerciseTypes.js";

export const planDayTypeSchema = z.enum(["lesson", "review", "rest", "assessment"]);
export type PlanDayType = z.infer<typeof planDayTypeSchema>;

export const planDayStatusSchema = z.enum(["locked", "available", "completed"]);
export type PlanDayStatus = z.infer<typeof planDayStatusSchema>;

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
});
export type PlanDay = z.infer<typeof planDaySchema>;

export const learningPlanStatusSchema = z.enum(["active", "completed", "archived"]);
export type LearningPlanStatus = z.infer<typeof learningPlanStatusSchema>;

export const learningPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: learningPlanStatusSchema,
  totalDays: z.number().int().positive(),
  startDate: z.string(),
  targetLevelStart: z.enum(CEFR_LEVELS).nullable(),
  targetLevelEnd: z.enum(CEFR_LEVELS).nullable(),
  generatedBy: z.enum(["ai", "manual", "template"]),
});
export type LearningPlan = z.infer<typeof learningPlanSchema>;

export const currentLearningPlanResponseSchema = z.object({
  plan: learningPlanSchema.nullable(),
  days: z.array(planDaySchema),
});
export type CurrentLearningPlanResponse = z.infer<typeof currentLearningPlanResponseSchema>;

export const learningGoalsSchema = z.object({
  id: z.string().uuid(),
  targetLevel: z.enum(CEFR_LEVELS).nullable(),
  focusAreas: z.array(z.string()),
  dailyMinutesGoal: z.number().int().positive(),
  motivation: z.string().nullable(),
  targetCompletionDate: z.string().nullable(),
});
export type LearningGoals = z.infer<typeof learningGoalsSchema>;
