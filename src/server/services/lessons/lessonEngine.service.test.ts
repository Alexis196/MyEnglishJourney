import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanDayRow } from "@myenglishjourney/shared";
import { buildLessonSpec } from "./lessonBlueprint";
import { makeLesson } from "./testFactories";

const env = vi.hoisted(() => ({ LESSON_GENERATIONS_PER_DAY: 10, LESSON_PREFETCH_NEXT: true, AI_OPENAI_FALLBACK_ENABLED: true }));
vi.mock("../../config/env", () => ({ env }));

const db = vi.hoisted(() => ({
  day: null as unknown as PlanDayRow,
  previous: null as unknown as PlanDayRow | null,
  generationsStarted: 0,
  profile: { current_level: "A1", explanation_language: "es" as const },
  plan: null as unknown as Record<string, unknown>,
  history: { exercises: [] as unknown[], attempts: [] as unknown[], titlesByDay: new Map<number, string>() },
  saved: { lessons: [] as string[], deleted: [] as string[], failedCodes: [] as string[] },
  insertError: null as Error | null,
}));
const ai = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock("../ai/index", () => ({ aiRouter: ai }));

vi.mock("../../repositories/planDay.repository", () => ({
  planDayRepository: {
    getById: vi.fn(async () => structuredClone(db.day)),
    getByNumber: vi.fn(async () => (db.previous ? structuredClone(db.previous) : null)),
    countGenerationsSince: vi.fn(async () => db.generationsStarted),
    // Same semantics as the conditional UPDATE: check-and-set with no await in between, so only one caller wins.
    claimGeneration: vi.fn(async (_s: unknown, _id: string, p: { staleBefore: string; nextAttempt: number }) => {
      const claimable =
        db.day.lesson_id === null &&
        (db.day.generation_status === "pending" ||
          db.day.generation_status === "failed" ||
          (db.day.generation_status === "generating" && (db.day.generation_started_at ?? "") < p.staleBefore));
      if (!claimable) return null;
      db.day = {
        ...db.day,
        generation_status: "generating",
        generation_started_at: new Date().toISOString(),
        generation_attempts: p.nextAttempt,
      };
      return structuredClone(db.day);
    }),
    markReady: vi.fn(async (_s: unknown, _id: string, lessonId: string) => {
      db.day = { ...db.day, lesson_id: lessonId, generation_status: "ready" };
    }),
    markFailed: vi.fn(async (_s: unknown, _id: string, code: string) => {
      db.saved.failedCodes.push(code);
      db.day = { ...db.day, generation_status: "failed", generation_error: code };
    }),
  },
}));
vi.mock("../../repositories/learningPlan.repository", () => ({
  learningPlanRepository: { getById: vi.fn(async () => db.plan) },
}));
vi.mock("../../repositories/profile.repository", () => ({ profileRepository: { getById: vi.fn(async () => db.profile) } }));
vi.mock("../../repositories/learningGoals.repository", () => ({ learningGoalsRepository: { getForUser: vi.fn(async () => null) } }));
vi.mock("../../repositories/lessonHistory.repository", () => ({
  lessonHistoryRepository: { loadForReview: vi.fn(async () => db.history), recentSamples: vi.fn(async () => []) },
}));
vi.mock("../../repositories/lesson.repository", () => ({
  lessonRepository: {
    create: vi.fn(async () => {
      db.saved.lessons.push("lesson-1");
      return { id: "lesson-1" };
    }),
    findIdByPlanDay: vi.fn(async () => null),
    deleteById: vi.fn(async (_s: unknown, id: string) => {
      db.saved.deleted.push(id);
    }),
  },
}));
vi.mock("../../repositories/lessonSection.repository", () => ({
  lessonSectionRepository: {
    bulkInsert: vi.fn(async (_s: unknown, rows: unknown[]) => {
      if (db.insertError) throw db.insertError;
      return rows.map((_, i) => ({ id: `section-${i}` }));
    }),
  },
}));
vi.mock("../../repositories/exercise.repository", () => ({ exerciseRepository: { bulkInsert: vi.fn(async () => []) } }));

const { lessonEngineService, GENERATION_STALE_MS } = await import("./lessonEngine.service");
const { MAX_CONTENT_ATTEMPTS } = await import("./lessonGenerator");
const { AIProviderFailureError } = await import("../ai/AIRouter");
const { BudgetExceededError } = await import("../../utils/AppError");

const supabase = {} as SupabaseClient;
const USER = "user-1";

function makeDay(overrides: Partial<PlanDayRow> = {}): PlanDayRow {
  return {
    id: "day-2",
    user_id: USER,
    learning_plan_id: "plan-1",
    day_number: 2,
    week_number: 1,
    day_type: "lesson",
    lesson_id: null,
    status: "available",
    unlocked_at: null,
    completed_at: null,
    theme: "Daily routines",
    generation_status: "pending",
    generation_started_at: null,
    generation_attempts: 0,
    generation_error: null,
    ...overrides,
  };
}

const spec30 = () => buildLessonSpec({ minutes: 30, level: "A1", dayType: "lesson" });
const goodLesson = () => ({ data: makeLesson(spec30()) });
const techLesson = () => {
  const lesson = makeLesson(spec30());
  lesson.sections[1]!.examples = ["I am a software developer."];
  return { data: lesson };
};
const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  vi.clearAllMocks();
  env.LESSON_GENERATIONS_PER_DAY = 10;
  env.AI_OPENAI_FALLBACK_ENABLED = true;
  db.day = makeDay();
  db.previous = makeDay({ id: "day-1", day_number: 1, status: "completed", lesson_id: "l0", generation_status: "ready" });
  db.generationsStarted = 0;
  db.profile = { current_level: "A1", explanation_language: "es" };
  db.plan = {
    id: "plan-1",
    user_id: USER,
    status: "active",
    total_days: 90,
    target_level_start: "A1",
    personalization: { interests: ["music"], focusAreas: ["daily_routines"], minutesPerSession: 30 },
  };
  db.history = { exercises: [], attempts: [], titlesByDay: new Map() };
  db.saved = { lessons: [], deleted: [], failedCodes: [] };
  db.insertError = null;
  ai.generate.mockReset();
});

describe("lessonEngineService.ensureLesson", () => {
  it("generates and saves a valid lesson for a user without history", async () => {
    ai.generate.mockResolvedValue(goodLesson());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result).toEqual({ status: "ready", lessonId: "lesson-1" });
    expect(ai.generate).toHaveBeenCalledTimes(1);
    expect(ai.generate.mock.calls[0]![1]).toMatchObject({ activityType: "lesson_generation", userId: USER });
    expect(db.day.generation_status).toBe("ready");
  });

  it("returns an existing lesson without calling the AI", async () => {
    db.day = makeDay({ lesson_id: "lesson-9", generation_status: "ready" });
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result).toEqual({ status: "ready", lessonId: "lesson-9" });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it("refuses to generate day N when day N-1 is not completed", async () => {
    db.previous = makeDay({ id: "day-1", day_number: 1, status: "available" });
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({
      code: "previous_day_not_completed",
    });
    expect(ai.generate).not.toHaveBeenCalled();
    expect(db.day.generation_status).toBe("pending");
  });

  it("refuses locked days and rest days", async () => {
    db.day = makeDay({ status: "locked" });
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({ code: "day_locked" });
    db.day = makeDay({ day_type: "rest" });
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({
      code: "rest_day_has_no_lesson",
    });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it("does not let someone else's day through", async () => {
    db.day = makeDay({ user_id: "someone-else" });
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({ code: "not_found" });
  });

  it("two simultaneous requests consume a single generation", async () => {
    ai.generate.mockImplementation(async () => {
      await tick(20);
      return goodLesson();
    });
    const [first, second] = await Promise.all([
      lessonEngineService.ensureLesson(supabase, USER, "day-2"),
      lessonEngineService.ensureLesson(supabase, USER, "day-2"),
    ]);
    expect(ai.generate).toHaveBeenCalledTimes(1);
    expect([first.status, second.status].sort()).toEqual(["generating", "ready"]);
    expect(db.saved.lessons).toHaveLength(1);
  });

  it("does not call the AI again while a fresh generation is in progress", async () => {
    db.day = makeDay({ generation_status: "generating", generation_started_at: new Date().toISOString() });
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result.status).toBe("generating");
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it("safely takes over a generation that got stuck", async () => {
    const stuckSince = new Date(Date.now() - GENERATION_STALE_MS - 60_000).toISOString();
    db.day = makeDay({ generation_status: "generating", generation_started_at: stuckSince, generation_attempts: 1 });
    ai.generate.mockResolvedValue(goodLesson());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result.status).toBe("ready");
    expect(ai.generate).toHaveBeenCalledTimes(1);
  });

  it("applies the per-user generation limit without touching pedagogical rules", async () => {
    db.generationsStarted = 10;
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({
      statusCode: 429,
      code: "lesson_generation_limit",
    });
    expect(ai.generate).not.toHaveBeenCalled();

    env.LESSON_GENERATIONS_PER_DAY = 11; // limit is configurable
    ai.generate.mockResolvedValue(goodLesson());
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).resolves.toMatchObject({ status: "ready" });
  });

  it("a user can move on to several lessons in one day while under the limit", async () => {
    ai.generate.mockResolvedValue(goodLesson());
    db.generationsStarted = 4;
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).resolves.toMatchObject({ status: "ready" });
  });

  it("repairs an invalid answer by asking again with the problems listed", async () => {
    ai.generate.mockResolvedValueOnce(techLesson()).mockResolvedValueOnce(goodLesson());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result.status).toBe("ready");
    expect(ai.generate).toHaveBeenCalledTimes(2);
    expect(ai.generate.mock.calls[1]![1].userPrompt).toContain("FIX THESE PROBLEMS");
    expect(ai.generate.mock.calls[1]![1].userPrompt).toMatch(/programming\/software/);
  });

  it("falls back to the other provider on the last try, then gives up without saving", async () => {
    ai.generate.mockResolvedValue(techLesson());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(ai.generate).toHaveBeenCalledTimes(MAX_CONTENT_ATTEMPTS);
    expect(ai.generate.mock.calls[0]![1].preferProvider).toBeUndefined();
    expect(ai.generate.mock.calls.at(-1)![1].preferProvider).toBe("openai");
    expect(result.status).toBe("failed");
    expect(db.saved.lessons).toHaveLength(0);
    expect(db.day.generation_status).toBe("failed");
    expect(db.saved.failedCodes).toEqual(["invalid_lesson"]);
  });

  it("with the OpenAI fallback off, retries only with Gemini and then leaves the day failed", async () => {
    env.AI_OPENAI_FALLBACK_ENABLED = false;
    ai.generate.mockResolvedValue(techLesson());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(ai.generate).toHaveBeenCalledTimes(MAX_CONTENT_ATTEMPTS - 1);
    for (const call of ai.generate.mock.calls) expect(call[1].preferProvider).toBeUndefined();
    expect(result.status).toBe("failed");
    expect(db.day.generation_status).toBe("failed");
    expect(db.saved.lessons).toHaveLength(0);
  });

  describe("pedagogical quality", () => {
    const noProduction = () => {
      const spec = spec30();
      const lesson = makeLesson(spec);
      lesson.sections[spec.blueprint.findIndex((section) => section.key === "production")]!.exercises = [];
      return { data: lesson };
    };
    const assessmentMostlyChoice = () => {
      const spec = spec30();
      const lesson = makeLesson(spec);
      const assessment = lesson.sections.at(-1)!;
      assessment.exercises = assessment.exercises.map((exercise, i) => ({
        exerciseType: "multiple_choice" as const,
        difficulty: exercise.difficulty,
        prompt: `Pick ${i}`,
        options: ["a", "b", "c"],
        correctOptionIndex: 0,
      }));
      return { data: lesson };
    };

    it("repairs an essential quality problem with one more attempt, telling the model what to fix", async () => {
      env.AI_OPENAI_FALLBACK_ENABLED = false;
      ai.generate.mockResolvedValueOnce(noProduction()).mockResolvedValueOnce(goodLesson());
      const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
      expect(result.status).toBe("ready");
      expect(ai.generate).toHaveBeenCalledTimes(2);
      expect(ai.generate.mock.calls[1]![1].userPrompt).toMatch(/main writing task/);
    });

    it("leaves the day failed when essential quality still fails after the repair attempt", async () => {
      env.AI_OPENAI_FALLBACK_ENABLED = false;
      ai.generate.mockResolvedValue(noProduction());
      const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
      expect(ai.generate).toHaveBeenCalledTimes(2); // never more than agreed while OpenAI is off
      expect(result.status).toBe("failed");
      expect(db.day.generation_status).toBe("failed");
      expect(db.day.lesson_id).toBeNull();
      expect(db.saved.lessons).toHaveLength(0);

      // and the student can try again later
      ai.generate.mockReset();
      ai.generate.mockResolvedValueOnce(goodLesson());
      await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).resolves.toMatchObject({ status: "ready" });
    });

    it("does not save a final assessment that is mostly recognition", async () => {
      env.AI_OPENAI_FALLBACK_ENABLED = false;
      ai.generate.mockResolvedValue(assessmentMostlyChoice());
      const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
      expect(result.status).toBe("failed");
      expect(db.saved.lessons).toHaveLength(0);
    });

    it("accepts desirable-quality deviations without spending another call", async () => {
      const spec = spec30();
      const lesson = makeLesson(spec);
      const construction = lesson.sections[spec.blueprint.findIndex((section) => section.key === "construction")]!;
      construction.exercises.push({ exerciseType: "word_ordering", words: ["Zed", "likes", "jam"], acceptedAnswers: ["Zed likes jam"], difficulty: "hard" });
      ai.generate.mockResolvedValue({ data: lesson });
      const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
      expect(result.status).toBe("ready");
      expect(ai.generate).toHaveBeenCalledTimes(1);
    });

    it("saves the stage, pattern and difficulty with the lesson", async () => {
      const lesson = goodLesson();
      ai.generate.mockResolvedValue(lesson);
      const { lessonSectionRepository } = await import("../../repositories/lessonSection.repository");
      await lessonEngineService.ensureLesson(supabase, USER, "day-2");
      const rows = vi.mocked(lessonSectionRepository.bulkInsert).mock.calls[0]![1] as Array<{ content: { stage?: string; pattern?: unknown } }>;
      expect(rows.map((row) => row.content.stage)).toEqual(spec30().blueprint.map((section) => section.stage));
      expect(rows.some((row) => row.content.pattern)).toBe(true);
      expect(rows.map((row) => row.content.stage)).not.toContain(undefined);
    });
  });

  it("marks the day failed when every provider is down, and lets the student retry", async () => {
    ai.generate.mockRejectedValueOnce(new AIProviderFailureError(undefined));
    const failed = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(failed.status).toBe("failed");
    expect(db.day.generation_status).toBe("failed");

    ai.generate.mockResolvedValueOnce(goodLesson());
    const retried = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(retried).toEqual({ status: "ready", lessonId: "lesson-1" });
    expect(db.day.generation_attempts).toBe(2);
  });

  it("explains when the monthly AI budget is used up", async () => {
    ai.generate.mockRejectedValueOnce(new BudgetExceededError());
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result.status).toBe("failed");
    expect(result.message).toMatch(/presupuesto/i);
  });

  it("removes a half-saved lesson if storing it fails", async () => {
    ai.generate.mockResolvedValue(goodLesson());
    db.insertError = new Error("db down");
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toThrow("db down");
    expect(db.saved.deleted).toEqual(["lesson-1"]);
    expect(db.day.generation_status).toBe("failed");
  });

  it("stops retrying a day that keeps failing within the window", async () => {
    db.day = makeDay({
      generation_status: "failed",
      generation_attempts: 5,
      generation_started_at: new Date().toISOString(),
    });
    await expect(lessonEngineService.ensureLesson(supabase, USER, "day-2")).rejects.toMatchObject({
      code: "lesson_generation_retry_limit",
    });
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it("feeds yesterday's mistakes to the model", async () => {
    db.history = {
      exercises: [
        {
          id: "ex-1",
          dayNumber: 1,
          exerciseType: "multiple_choice",
          content: { prompt: "She ___ a nurse.", options: ["is", "are", "am"] },
          answerKey: { correctOptionIndex: 0 },
          sectionVocabulary: [],
        },
      ],
      attempts: [{ exerciseId: "ex-1", isCorrect: false, response: { selectedOptionIndex: 1 }, submittedAt: "2026-01-01T10:00:00Z" }],
      titlesByDay: new Map([[1, "Meeting people"]]),
    };
    ai.generate.mockResolvedValue(goodLesson());
    await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    const prompt = ai.generate.mock.calls[0]![1].userPrompt as string;
    expect(prompt).toContain("She ___ a nurse.");
    expect(prompt).toContain('correct: "is"');
    expect(prompt).toContain("Previous lesson: Meeting people");
  });

  it("uses the session length and level of the student", async () => {
    db.profile = { current_level: "B1", explanation_language: "es" };
    db.plan.personalization = { interests: [], focusAreas: [], minutesPerSession: 60 };
    ai.generate.mockResolvedValue({ data: makeLesson(buildLessonSpec({ minutes: 60, level: "B1", dayType: "lesson" })) });
    const result = await lessonEngineService.ensureLesson(supabase, USER, "day-2");
    expect(result.status).toBe("ready");
    const prompt = ai.generate.mock.calls[0]![1].userPrompt as string;
    expect(prompt).toContain("CEFR level: B1");
    expect(prompt).toContain("~60 minutes");
  });
});

describe("lessonEngineService.prepareDay", () => {
  it("never throws, even when generation fails", async () => {
    db.day = makeDay();
    ai.generate.mockRejectedValue(new Error("boom"));
    await expect(lessonEngineService.prepareDay(supabase, USER, "plan-1", 2)).resolves.toBeUndefined();
  });

  it("does nothing when background preparation is disabled", async () => {
    env.LESSON_PREFETCH_NEXT = false;
    await lessonEngineService.prepareDay(supabase, USER, "plan-1", 2);
    expect(ai.generate).not.toHaveBeenCalled();
    env.LESSON_PREFETCH_NEXT = true;
  });

  it("skips days that are still locked", async () => {
    db.day = makeDay({ status: "locked" });
    await lessonEngineService.prepareDay(supabase, USER, "plan-1", 2);
    expect(ai.generate).not.toHaveBeenCalled();
  });
});
