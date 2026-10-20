import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const env = vi.hoisted(() => ({
  GEMINI_LIVE_MODEL: "gemini-3.8-live",
  LIVE_SESSION_MAX_SECONDS: 300,
  LIVE_SESSIONS_PER_DAY: 3,
  LIVE_COST_PER_MINUTE_USD: 0.023,
}));
vi.mock("../config/env", () => ({ env }));

type Row = {
  id: string;
  user_id: string;
  mode: "free" | "scenario";
  scenario: string | null;
  level: string | null;
  model: string;
  status: "active" | "completed" | "abandoned" | "failed";
  max_seconds: number;
  duration_seconds: number | null;
  transcript: unknown;
  ai_feedback: unknown;
  estimated_cost_usd: number;
  started_at: string;
  ended_at: string | null;
};

const db = vi.hoisted(() => ({
  sessions: [] as Row[],
  usage: [] as Array<{ activityType: string; costUsd: number; status: string }>,
  journal: [] as Array<{ originalText: string; sourceType: string }>,
  budget: { allowed: true, monthToDateSpendUsd: 0, settings: { hard_block_at_budget: true, monthly_budget_usd: 3 } },
  tokenFails: false,
  tokenError: "gemini down",
  feedbackFails: false,
  feedback: {
    summary: "Hablaron de café.",
    corrections: [{ original: "I want coffee", corrected: "I'd like a coffee", explanation: "Más cortés" }],
    usefulPhrases: [],
    strengths: "Buen vocabulario",
    nextStep: "Practicar pedidos",
  },
}));
const ai = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock("./ai/index", () => ({
  aiRouter: ai,
  AIUsageService: { checkBudget: vi.fn(async () => db.budget) },
  buildLiveTutorInstruction: vi.fn(() => "INSTRUCTION"),
  buildLiveFeedbackSystemPrompt: vi.fn(() => "SYSTEM"),
  buildLiveFeedbackUserPrompt: vi.fn(() => "USER"),
}));
vi.mock("./ai/liveToken", () => ({
  createLiveToken: vi.fn(async () => {
    if (db.tokenFails) throw new Error(db.tokenError);
    return "auth_tokens/abc";
  }),
}));
vi.mock("../repositories/aiUsageLog.repository", () => ({
  aiUsageLogRepository: {
    insert: vi.fn(async (_s: unknown, input: { activityType: string; costUsd: number; status: string }) => {
      db.usage.push(input);
    }),
  },
}));
vi.mock("../repositories/errorJournal.repository", () => ({
  errorJournalRepository: {
    listOpen: vi.fn(async () => []),
    record: vi.fn(async (_s: unknown, input: { originalText: string; sourceType: string }) => {
      db.journal.push(input);
    }),
  },
}));
vi.mock("../repositories/learningPlan.repository", () => ({
  learningPlanRepository: { getCurrentForUser: vi.fn(async () => ({ target_level_start: "A1", personalization: null })) },
}));
vi.mock("../repositories/profile.repository", () => ({
  profileRepository: { getById: vi.fn(async () => ({ current_level: "A2", explanation_language: "es", current_plan_id: null })) },
}));
vi.mock("../repositories/liveSpeakingSession.repository", () => ({
  liveSpeakingSessionRepository: {
    create: vi.fn(async (_s: unknown, input: { userId: string; mode: "free" | "scenario"; scenario: string | null; level: string; model: string; maxSeconds: number }) => {
      const row: Row = {
        id: `00000000-0000-4000-8000-00000000000${db.sessions.length + 1}`,
        user_id: input.userId,
        mode: input.mode,
        scenario: input.scenario,
        level: input.level,
        model: input.model,
        status: "active",
        max_seconds: input.maxSeconds,
        duration_seconds: null,
        transcript: null,
        ai_feedback: null,
        estimated_cost_usd: 0,
        started_at: new Date().toISOString(),
        ended_at: null,
      };
      db.sessions.push(row);
      return { ...row };
    }),
    getById: vi.fn(async (_s: unknown, id: string) => ({ ...db.sessions.find((row) => row.id === id)! })),
    countStartedSince: vi.fn(async () => db.sessions.length),
    listStaleActive: vi.fn(async (_s: unknown, _u: string, olderThan: Date) =>
      db.sessions.filter((row) => row.status === "active" && new Date(row.started_at) < olderThan).map((row) => ({ ...row })),
    ),
    finish: vi.fn(async (_s: unknown, id: string, fields: { status: Row["status"]; durationSeconds: number; transcript: unknown; aiFeedback: unknown; estimatedCostUsd: number }) => {
      const row = db.sessions.find((item) => item.id === id)!;
      if (row.status !== "active") return null;
      Object.assign(row, {
        status: fields.status,
        duration_seconds: fields.durationSeconds,
        transcript: fields.transcript,
        ai_feedback: fields.aiFeedback,
        estimated_cost_usd: fields.estimatedCostUsd,
        ended_at: new Date().toISOString(),
      });
      return { ...row };
    }),
  },
}));

import { estimateLiveCostUsd, liveSpeakingService } from "./liveSpeaking.service";

const supabase = {} as SupabaseClient;
const USER = "user-1";

const turns = [
  { role: "tutor" as const, text: "Hello! What would you like?" },
  { role: "user" as const, text: "I want coffee" },
  { role: "tutor" as const, text: "Sure! Anything else?" },
  { role: "user" as const, text: "No thanks" },
];

beforeEach(() => {
  db.sessions = [];
  db.usage = [];
  db.journal = [];
  db.budget = { allowed: true, monthToDateSpendUsd: 0, settings: { hard_block_at_budget: true, monthly_budget_usd: 3 } };
  db.tokenFails = false;
  db.tokenError = "gemini down";
  env.LIVE_COST_PER_MINUTE_USD = 0.023;
  db.feedbackFails = false;
  ai.generate.mockReset();
  ai.generate.mockImplementation(async () => {
    if (db.feedbackFails) throw new Error("model down");
    return { data: db.feedback };
  });
});

describe("live speaking: starting", () => {
  it("returns a one-use token and the server-built instruction, never the API key", async () => {
    const started = await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });
    expect(started).toMatchObject({ token: "auth_tokens/abc", model: "gemini-3.8-live", maxSeconds: 300, systemInstruction: "INSTRUCTION", scenarioTitle: null });
    expect(JSON.stringify(started)).not.toContain("AIza");
    expect(db.sessions).toHaveLength(1);
    expect(db.sessions[0]).toMatchObject({ level: "A2", status: "active" });
  });

  it("starts a role-play from a known scenario and rejects an unknown one", async () => {
    const started = await liveSpeakingService.start(supabase, USER, { mode: "scenario", scenarioId: "coffee_shop", correctWhileTalking: true });
    expect(started.scenarioTitle).toBe("Pedir en una cafetería");
    await expect(liveSpeakingService.start(supabase, USER, { mode: "scenario", scenarioId: "nope", correctWhileTalking: false })).rejects.toThrow("Situación no encontrada");
  });

  it("stops at the daily conversation limit", async () => {
    for (let i = 0; i < 3; i += 1) await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });
    await expect(liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false })).rejects.toMatchObject({ code: "live_daily_limit" });
  });

  it("refuses to start when a full conversation would break the monthly budget", async () => {
    // A 5-minute conversation is reserved at its worst-case cost (~0.115 USD).
    db.budget = { allowed: true, monthToDateSpendUsd: 2.95, settings: { hard_block_at_budget: true, monthly_budget_usd: 3 } };
    await expect(liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false })).rejects.toMatchObject({ code: "ai_budget_exceeded" });
    expect(db.sessions).toHaveLength(0);
  });

  it("lets a student with a soft budget keep practising", async () => {
    db.budget = { allowed: true, monthToDateSpendUsd: 2.95, settings: { hard_block_at_budget: false, monthly_budget_usd: 3 } };
    await expect(liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false })).resolves.toBeTruthy();
  });

  it("marks the session failed (and free) when the token cannot be created", async () => {
    db.tokenFails = true;
    await expect(liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false })).rejects.toMatchObject({ code: "live_unavailable" });
    expect(db.sessions[0]).toMatchObject({ status: "failed", estimated_cost_usd: 0 });
    expect(db.usage).toHaveLength(0);
  });

  it("reports an exhausted free-tier quota in plain words", async () => {
    db.tokenFails = true;
    db.tokenError = "429 RESOURCE_EXHAUSTED: quota exceeded";
    await expect(liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false })).rejects.toMatchObject({
      code: "live_quota",
      statusCode: 429,
    });
  });

  it("settles abandoned conversations at their full length before opening a new one", async () => {
    await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });
    db.sessions[0]!.started_at = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });

    expect(db.sessions[0]).toMatchObject({ status: "abandoned", duration_seconds: 300 });
    expect(db.usage).toEqual([expect.objectContaining({ activityType: "live_speaking", status: "error", costUsd: estimateLiveCostUsd(300) })]);
  });
});

describe("live speaking: ending", () => {
  async function startOne() {
    const started = await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });
    return started.sessionId;
  }

  it("charges the estimated cost, stores the transcript and returns feedback", async () => {
    const id = await startOne();
    db.sessions[0]!.started_at = new Date(Date.now() - 125_000).toISOString();

    const result = await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 120, turns });

    expect(result).toMatchObject({ status: "completed", durationSeconds: 120, feedback: { summary: "Hablaron de café." } });
    expect(db.usage).toEqual([expect.objectContaining({ activityType: "live_speaking", status: "success", costUsd: estimateLiveCostUsd(120) })]);
    expect(db.sessions[0]).toMatchObject({ status: "completed", transcript: turns });
  });

  it("feeds the student's real mistakes into the error journal as speaking errors", async () => {
    const id = await startOne();
    db.sessions[0]!.started_at = new Date(Date.now() - 60_000).toISOString();
    await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 55, turns });
    expect(db.journal).toEqual([expect.objectContaining({ originalText: "I want coffee", sourceType: "speaking" })]);
  });

  it("does not trust a duration longer than the session or the wall clock allow", async () => {
    const id = await startOne();
    // Only a few seconds have really passed, whatever the client claims.
    const result = await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 3000, turns });
    expect(result.durationSeconds).toBeLessThanOrEqual(5);
    expect(db.usage[0]!.costUsd).toBeLessThan(estimateLiveCostUsd(10));
  });

  it("skips the AI analysis when the student barely spoke", async () => {
    const id = await startOne();
    const result = await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 10, turns: [turns[0]!, turns[1]!] });
    expect(result.feedback).toBeNull();
    expect(ai.generate).not.toHaveBeenCalled();
    expect(db.sessions[0]!.status).toBe("completed");
  });

  it("keeps the transcript and the charge even when the analysis fails", async () => {
    db.feedbackFails = true;
    const id = await startOne();
    db.sessions[0]!.started_at = new Date(Date.now() - 60_000).toISOString();
    const result = await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 50, turns });
    expect(result).toMatchObject({ status: "completed", feedback: null });
    expect(db.sessions[0]!.transcript).toEqual(turns);
    expect(db.usage).toHaveLength(1);
  });

  it("is safe to end twice: the second call changes nothing and charges nothing", async () => {
    const id = await startOne();
    db.sessions[0]!.started_at = new Date(Date.now() - 60_000).toISOString();
    await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 50, turns });
    const again = await liveSpeakingService.end(supabase, USER, id, { durationSeconds: 50, turns });
    expect(again.status).toBe("completed");
    expect(db.usage).toHaveLength(1);
    expect(ai.generate).toHaveBeenCalledTimes(1);
  });

  it("does not let one user end another user's conversation", async () => {
    const id = await startOne();
    await expect(liveSpeakingService.end(supabase, "someone-else", id, { durationSeconds: 5, turns })).rejects.toThrow("no encontrada");
  });
});

describe("live cost estimate", () => {
  it("is free on the Gemini free tier: nothing is charged to the budget, even right at the limit", async () => {
    env.LIVE_COST_PER_MINUTE_USD = 0;
    db.budget = { allowed: true, monthToDateSpendUsd: 2.99, settings: { hard_block_at_budget: true, monthly_budget_usd: 3 } };
    const started = await liveSpeakingService.start(supabase, USER, { mode: "free", correctWhileTalking: false });
    db.sessions[0]!.started_at = new Date(Date.now() - 90_000).toISOString();
    await liveSpeakingService.end(supabase, USER, started.sessionId, { durationSeconds: 80, turns });
    expect(db.usage[0]).toMatchObject({ costUsd: 0, status: "success" });
    expect(estimateLiveCostUsd(300)).toBe(0);
  });

  it("is proportional to the time and uses the configured per-minute rate", () => {
    expect(estimateLiveCostUsd(60)).toBeCloseTo(0.023, 6);
    expect(estimateLiveCostUsd(300)).toBeCloseTo(0.115, 6);
    expect(estimateLiveCostUsd(0)).toBe(0);
  });
});
