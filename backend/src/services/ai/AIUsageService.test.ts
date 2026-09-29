import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserAiSettingsRow } from "@myenglishjourney/shared";

vi.mock("../../repositories/aiUsageLog.repository.js", () => ({
  aiUsageLogRepository: {
    insert: vi.fn(),
    getMonthToDateSpendUsd: vi.fn(),
  },
}));
vi.mock("../../repositories/userAiSettings.repository.js", () => ({
  userAiSettingsRepository: {
    getForUser: vi.fn(),
  },
}));

const { aiUsageLogRepository } = await import("../../repositories/aiUsageLog.repository.js");
const { userAiSettingsRepository } = await import("../../repositories/userAiSettings.repository.js");
const { AIUsageService } = await import("./AIUsageService.js");
const { UnpricedModelError } = await import("./pricing.js");

const fakeSupabase = {} as SupabaseClient;

function makeSettings(overrides: Partial<UserAiSettingsRow> = {}): UserAiSettingsRow {
  return {
    user_id: "user-1",
    provider_mode: "auto",
    monthly_budget_usd: 3,
    hard_block_at_budget: true,
    notify_at_percent: 80,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AIUsageService.checkBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows the call when month-to-date spend is under budget", async () => {
    vi.mocked(userAiSettingsRepository.getForUser).mockResolvedValue(makeSettings({ monthly_budget_usd: 3 }));
    vi.mocked(aiUsageLogRepository.getMonthToDateSpendUsd).mockResolvedValue(1);

    const result = await AIUsageService.checkBudget(fakeSupabase, "user-1");
    expect(result.allowed).toBe(true);
  });

  it("blocks the call when spend reaches the budget and hard_block_at_budget is true", async () => {
    vi.mocked(userAiSettingsRepository.getForUser).mockResolvedValue(
      makeSettings({ monthly_budget_usd: 3, hard_block_at_budget: true }),
    );
    vi.mocked(aiUsageLogRepository.getMonthToDateSpendUsd).mockResolvedValue(3);

    const result = await AIUsageService.checkBudget(fakeSupabase, "user-1");
    expect(result.allowed).toBe(false);
  });

  it("does not block when over budget but hard_block_at_budget is false", async () => {
    vi.mocked(userAiSettingsRepository.getForUser).mockResolvedValue(
      makeSettings({ monthly_budget_usd: 3, hard_block_at_budget: false }),
    );
    vi.mocked(aiUsageLogRepository.getMonthToDateSpendUsd).mockResolvedValue(10);

    const result = await AIUsageService.checkBudget(fakeSupabase, "user-1");
    expect(result.allowed).toBe(true);
    expect(result.percentUsed).toBeGreaterThan(100);
  });
});

describe("AIUsageService.logSuccess", () => {
  beforeEach(() => vi.clearAllMocks());

  it("computes cost from the pricing table and logs a success row", async () => {
    await AIUsageService.logSuccess(fakeSupabase, {
      userId: "user-1",
      provider: "gemini",
      model: "gemini-1.5-flash",
      activityType: "writing_feedback",
      usage: { promptTokens: 1_000_000, completionTokens: 1_000_000, totalTokens: 2_000_000 },
      latencyMs: 500,
    });

    expect(aiUsageLogRepository.insert).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({ status: "success", costUsd: 0.375, provider: "gemini" }),
    );
  });

  it("throws instead of silently logging $0 for an unpriced model", async () => {
    await expect(
      AIUsageService.logSuccess(fakeSupabase, {
        userId: "user-1",
        provider: "gemini",
        model: "some-future-model",
        activityType: "writing_feedback",
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
        latencyMs: 100,
      }),
    ).rejects.toBeInstanceOf(UnpricedModelError);
    expect(aiUsageLogRepository.insert).not.toHaveBeenCalled();
  });
});

describe("AIUsageService.logFailure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs status 'fallback' when the router will try another provider", async () => {
    await AIUsageService.logFailure(
      fakeSupabase,
      "user-1",
      "writing_feedback",
      { category: "quota_exceeded", retryable: false, fallbackEligible: true, providerName: "gemini", message: "quota", originalError: null },
      true,
    );
    expect(aiUsageLogRepository.insert).toHaveBeenCalledWith(fakeSupabase, expect.objectContaining({ status: "fallback", costUsd: 0 }));
  });

  it("logs status 'error' when it's terminal", async () => {
    await AIUsageService.logFailure(
      fakeSupabase,
      "user-1",
      "writing_feedback",
      { category: "auth_error", retryable: false, fallbackEligible: false, providerName: "openai", message: "bad key", originalError: null },
      false,
    );
    expect(aiUsageLogRepository.insert).toHaveBeenCalledWith(fakeSupabase, expect.objectContaining({ status: "error" }));
  });
});
