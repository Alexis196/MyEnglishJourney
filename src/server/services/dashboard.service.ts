import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardSummary } from "@myenglishjourney/shared";
import { profileRepository } from "../repositories/profile.repository";
import { learningPlanRepository } from "../repositories/learningPlan.repository";
import { planDayRepository } from "../repositories/planDay.repository";

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const dashboardService = {
  async getSummary(supabase: SupabaseClient, userId: string): Promise<DashboardSummary> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    // Everything below is independent of which plan is selected, so it all runs in one round
    // trip instead of one query after another (each one costs a full network hop to Supabase).
    const [profile, fallbackPlan, wordsResult, errorsResult, sessionsResult, attemptsResult] = await Promise.all([
      profileRepository.getById(supabase, userId),
      learningPlanRepository.getActiveForUser(supabase, userId),
      supabase.from("vocabulary").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("error_journal")
        .select("id, original_text, corrected_text, explanation, error_category")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("study_sessions")
        .select("started_at, duration_seconds")
        .eq("user_id", userId)
        .gte("started_at", sevenDaysAgo.toISOString()),
      supabase
        .from("exercise_attempts")
        .select("submitted_at")
        .eq("user_id", userId)
        .gte("submitted_at", sevenDaysAgo.toISOString()),
    ]);

    const emptySummary: DashboardSummary = {
      hasActivePlan: false,
      currentDay: null,
      totalDays: null,
      estimatedLevel: (profile.current_level as DashboardSummary["estimatedLevel"]) ?? null,
      progressPercent: null,
      totalMinutesStudied: 0,
      currentStreak: profile.streak_count,
      longestStreak: profile.longest_streak,
      nextLesson: null,
      wordsLearnedCount: 0,
      recentErrors: [],
      weeklyProgress: [],
    };

    // The selected plan wins; reuse the already-fetched active plan when it is the same one.
    const plan =
      profile.current_plan_id && fallbackPlan?.id !== profile.current_plan_id
        ? ((await learningPlanRepository.getCurrentForUser(supabase, userId, profile.current_plan_id)) ?? fallbackPlan)
        : fallbackPlan;

    if (!plan) return emptySummary;

    // One round trip: the plan's days plus the lessons attached to its currently available days
    // (lessons <-> plan_days has two foreign keys, so the embed names the one to follow).
    const [days, availableLessons] = await Promise.all([
      planDayRepository.listForPlan(supabase, plan.id),
      supabase
        .from("lessons")
        .select("id, title, plan_days!lessons_plan_day_id_fkey!inner(learning_plan_id, status)")
        .eq("plan_days.learning_plan_id", plan.id)
        .eq("plan_days.status", "available"),
    ]);
    if (availableLessons.error) throw availableLessons.error;
    const completedCount = days.filter((d) => d.status === "completed").length;

    // `days` is ordered by day_number, so the first available day is the next one to study.
    const nextDay = days.find((d) => d.status === "available") ?? null;
    const lessonRow = nextDay?.lesson_id
      ? (availableLessons.data ?? []).find((lesson) => lesson.id === nextDay.lesson_id)
      : undefined;
    // Without a lesson yet (not generated), the day still shows up: opening it prepares the lesson.
    const nextLesson: DashboardSummary["nextLesson"] = nextDay
      ? {
          lessonId: (lessonRow?.id as string | undefined) ?? null,
          planDayId: nextDay.id,
          title: (lessonRow?.title as string | undefined) ?? nextDay.theme ?? `Día ${nextDay.day_number}`,
          dayNumber: nextDay.day_number,
        }
      : null;

    const weeklyMap = new Map<string, { minutesStudied: number; exercisesCompleted: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      weeklyMap.set(isoDateOnly(d), { minutesStudied: 0, exercisesCompleted: 0 });
    }
    for (const session of sessionsResult.data ?? []) {
      const key = isoDateOnly(new Date(session.started_at as string));
      const entry = weeklyMap.get(key);
      if (entry) entry.minutesStudied += Math.round(((session.duration_seconds as number) ?? 0) / 60);
    }
    for (const attempt of attemptsResult.data ?? []) {
      const key = isoDateOnly(new Date(attempt.submitted_at as string));
      const entry = weeklyMap.get(key);
      if (entry) entry.exercisesCompleted += 1;
    }

    const totalMinutesStudied = Array.from(weeklyMap.values()).reduce((sum, v) => sum + v.minutesStudied, 0);

    return {
      hasActivePlan: true,
      currentDay: Math.min(completedCount + 1, plan.total_days),
      totalDays: plan.total_days,
      estimatedLevel: (profile.current_level as DashboardSummary["estimatedLevel"]) ?? null,
      progressPercent: plan.total_days > 0 ? Math.round((completedCount / plan.total_days) * 100) : 0,
      totalMinutesStudied,
      currentStreak: profile.streak_count,
      longestStreak: profile.longest_streak,
      nextLesson,
      wordsLearnedCount: wordsResult.count ?? 0,
      recentErrors: (errorsResult.data ?? []).map((row) => ({
        id: row.id as string,
        originalText: row.original_text as string,
        correctedText: row.corrected_text as string,
        explanation: row.explanation as string,
        errorCategory: row.error_category as string,
      })),
      weeklyProgress: Array.from(weeklyMap.entries()).map(([date, v]) => ({ date, ...v })),
    };
  },
};
