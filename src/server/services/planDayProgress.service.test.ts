import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningPlanRow, PlanDayRow } from "@myenglishjourney/shared";

type DayStatus = PlanDayRow["status"];

const state = vi.hoisted(() => ({
  days: new Map<number, { id: string; user_id: string; day_number: number; learning_plan_id: string; status: string; day_type: string }>(),
  plan: { id: "plan-1", total_days: 90, status: "active" } as Pick<LearningPlanRow, "id" | "total_days" | "status">,
  lessonDayId: "day-1",
  planStatusSet: [] as string[],
}));

vi.mock("../repositories/planDay.repository", () => ({
  planDayRepository: {
    getById: vi.fn(async (_s: unknown, id: string) => [...state.days.values()].find((d) => d.id === id) ?? null),
    // Conditional UPDATE semantics: only an "available" day becomes completed.
    markCompleted: vi.fn(async (_s: unknown, id: string) => {
      const day = [...state.days.values()].find((d) => d.id === id);
      if (!day || day.status !== "available") return false;
      day.status = "completed";
      return true;
    }),
    // Only a "locked" day becomes available.
    unlock: vi.fn(async (_s: unknown, _plan: string, dayNumber: number) => {
      const day = state.days.get(dayNumber);
      if (!day || day.status !== "locked") return null;
      day.status = "available";
      return day;
    }),
  },
}));
vi.mock("../repositories/learningPlan.repository", () => ({
  learningPlanRepository: {
    getById: vi.fn(async () => state.plan),
    setStatus: vi.fn(async (_s: unknown, _id: string, status: string) => {
      state.planStatusSet.push(status);
    }),
  },
}));
vi.mock("../repositories/lesson.repository", () => ({
  lessonRepository: { getPlanDayId: vi.fn(async () => state.lessonDayId) },
}));

const { planDayProgressService } = await import("./planDayProgress.service");
const supabase = {} as SupabaseClient;
const USER = "user-1";

function seed(statuses: Record<number, DayStatus>, dayTypes: Record<number, string> = {}) {
  state.days.clear();
  for (const [n, status] of Object.entries(statuses)) {
    const dayNumber = Number(n);
    state.days.set(dayNumber, {
      id: `day-${dayNumber}`,
      user_id: USER,
      day_number: dayNumber,
      learning_plan_id: "plan-1",
      status,
      day_type: dayTypes[dayNumber] ?? "lesson",
    });
  }
}

beforeEach(() => {
  state.plan = { id: "plan-1", total_days: 90, status: "active" };
  state.planStatusSet = [];
  state.lessonDayId = "day-1";
});

describe("planDayProgressService", () => {
  it("completing day N completes it and unlocks N+1", async () => {
    seed({ 1: "available", 2: "locked", 3: "locked" });
    const result = await planDayProgressService.completeForLesson(supabase, USER, "lesson-1");
    expect(result).toEqual({ learningPlanId: "plan-1", unlockedDayNumber: 2 });
    expect(state.days.get(1)?.status).toBe("completed");
    expect(state.days.get(2)?.status).toBe("available");
    expect(state.days.get(3)?.status).toBe("locked");
  });

  it("is idempotent: completing twice does not unlock further days", async () => {
    seed({ 1: "available", 2: "locked", 3: "locked" });
    await planDayProgressService.completeForLesson(supabase, USER, "lesson-1");
    const again = await planDayProgressService.completeForLesson(supabase, USER, "lesson-1");
    expect(again.unlockedDayNumber).toBeNull();
    expect(state.days.get(3)?.status).toBe("locked");
  });

  it("cannot complete a day that was never unlocked", async () => {
    seed({ 1: "locked", 2: "locked" });
    await expect(planDayProgressService.completeForLesson(supabase, USER, "lesson-1")).rejects.toMatchObject({ code: "day_locked" });
    expect(state.days.get(2)?.status).toBe("locked");
  });

  it("closes the plan after the last day", async () => {
    state.plan = { id: "plan-1", total_days: 2, status: "active" };
    state.lessonDayId = "day-2";
    seed({ 1: "completed", 2: "available" });
    const result = await planDayProgressService.completeForLesson(supabase, USER, "lesson-2");
    expect(result.unlockedDayNumber).toBeNull();
    expect(state.planStatusSet).toEqual(["completed"]);
  });

  it("does not touch another user's day", async () => {
    seed({ 1: "available", 2: "locked" });
    await expect(planDayProgressService.completeDay(supabase, "intruder", "day-1")).rejects.toMatchObject({ code: "not_found" });
    expect(state.days.get(1)?.status).toBe("available");
  });

  it("rest days are confirmed directly; other days are not", async () => {
    seed({ 1: "completed", 2: "available", 3: "locked" }, { 2: "rest" });
    const result = await planDayProgressService.completeRestDay(supabase, USER, "day-2");
    expect(result.unlockedDayNumber).toBe(3);

    seed({ 1: "available", 2: "locked" });
    await expect(planDayProgressService.completeRestDay(supabase, USER, "day-1")).rejects.toMatchObject({ code: "not_a_rest_day" });
  });
});
