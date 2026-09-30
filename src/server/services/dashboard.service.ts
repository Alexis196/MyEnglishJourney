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
    const profile = await profileRepository.getById(supabase, userId);
    const plan = await learningPlanRepository.getActiveForUser(supabase, userId);

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

    if (!plan) return emptySummary;

    const days = await planDayRepository.listForPlan(supabase, plan.id);
    const completedCount = days.filter((d) => d.status === "completed").length;
    const nextDay = await planDayRepository.getNextAvailable(supabase, plan.id);

    let nextLesson: DashboardSummary["nextLesson"] = null;
    if (nextDay?.lesson_id) {
      const { data: lessonRow } = await supabase.from("lessons").select("id, title").eq("id", nextDay.lesson_id).maybeSingle();
      if (lessonRow) {
        nextLesson = { lessonId: lessonRow.id as string, title: lessonRow.title as string, dayNumber: nextDay.day_number };
      }
    }

    const { count: wordsLearnedCount } = await supabase
      .from("vocabulary")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: errorRows } = await supabase
      .from("error_journal")
      .select("id, original_text, corrected_text, explanation, error_category")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const { data: studySessions } = await supabase
      .from("study_sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", userId)
      .gte("started_at", sevenDaysAgo.toISOString());

    const { data: attempts } = await supabase
      .from("exercise_attempts")
      .select("submitted_at")
      .eq("user_id", userId)
      .gte("submitted_at", sevenDaysAgo.toISOString());

    const weeklyMap = new Map<string, { minutesStudied: number; exercisesCompleted: number }>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);
      weeklyMap.set(isoDateOnly(d), { minutesStudied: 0, exercisesCompleted: 0 });
    }
    for (const session of studySessions ?? []) {
      const key = isoDateOnly(new Date(session.started_at as string));
      const entry = weeklyMap.get(key);
      if (entry) entry.minutesStudied += Math.round(((session.duration_seconds as number) ?? 0) / 60);
    }
    for (const attempt of attempts ?? []) {
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
      wordsLearnedCount: wordsLearnedCount ?? 0,
      recentErrors: (errorRows ?? []).map((row) => ({
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
