import { z } from "zod";
import { CEFR_LEVELS } from "../constants/exerciseTypes";

/**
 * Every field here must come from a real query against Supabase data.
 * When the user has no active plan yet, hasActivePlan is false and the
 * frontend renders a designed empty state instead of zeros pretending
 * to be real progress.
 */
export const dashboardSummarySchema = z.object({
  hasActivePlan: z.boolean(),
  currentDay: z.number().int().nonnegative().nullable(),
  totalDays: z.number().int().nonnegative().nullable(),
  estimatedLevel: z.enum(CEFR_LEVELS).nullable(),
  progressPercent: z.number().min(0).max(100).nullable(),
  totalMinutesStudied: z.number().int().nonnegative(),
  currentStreak: z.number().int().nonnegative(),
  longestStreak: z.number().int().nonnegative(),
  nextLesson: z
    .object({
      /** Null while the lesson has not been generated yet; open the day page to prepare it. */
      lessonId: z.string().uuid().nullable(),
      planDayId: z.string().uuid(),
      title: z.string(),
      dayNumber: z.number().int().positive(),
    })
    .nullable(),
  wordsLearnedCount: z.number().int().nonnegative(),
  recentErrors: z.array(
    z.object({
      id: z.string().uuid(),
      originalText: z.string(),
      correctedText: z.string(),
      explanation: z.string(),
      errorCategory: z.string(),
    }),
  ),
  weeklyProgress: z.array(
    z.object({
      date: z.string(),
      minutesStudied: z.number().int().nonnegative(),
      exercisesCompleted: z.number().int().nonnegative(),
    }),
  ),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
