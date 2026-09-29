import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserAiSettingsRow } from "@myenglishjourney/shared";

vi.mock("./AIUsageService.js", () => ({
  AIUsageService: {
    checkBudget: vi.fn(),
    logSuccess: vi.fn(),
    logFailure: vi.fn(),
  },
}));

const { AIUsageService } = await import("./AIUsageService.js");
const { AIRouter, AIProviderFailureError } = await import("./AIRouter.js");
const { BudgetExceededError } = await import("../../utils/AppError.js");

import type { AIGenerationRequest, AIGenerationResult, AIProvider } from "./types.js";

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

function allowBudget(overrides: Partial<UserAiSettingsRow> = {}) {
  vi.mocked(AIUsageService.checkBudget).mockResolvedValue({
    allowed: true,
    monthToDateSpendUsd: 0,
    percentUsed: 0,
    settings: makeSettings(overrides),
  });
}

function makeProvider(name: "gemini" | "openai"): AIProvider & { generateStructured: ReturnType<typeof vi.fn> } {
  return {
    name,
    isConfigured: vi.fn().mockReturnValue(true),
    generateStructured: vi.fn(),
  };
}

function fakeRequest(): AIGenerationRequest<{ ok: boolean }> {
  return {
    activityType: "writing_feedback",
    systemPrompt: "system",
    userPrompt: "user",
    responseSchema: { parse: (v: unknown) => v } as never,
    userId: "user-1",
  };
}

function fakeResult(provider: "gemini" | "openai"): AIGenerationResult<{ ok: boolean }> {
  return {
    data: { ok: true },
    provider,
    model: "test-model",
    usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    latencyMs: 42,
  };
}

const fakeSupabase = {} as SupabaseClient;

describe("AIRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the primary provider's result on success without touching the fallback", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured.mockResolvedValue(fakeResult("gemini"));

    const router = new AIRouter(gemini, openai, { baseDelayMs: 1, maxDelayMs: 2 });
    const result = await router.generate(fakeSupabase, fakeRequest());

    expect(result.provider).toBe("gemini");
    expect(openai.generateStructured).not.toHaveBeenCalled();
    expect(AIUsageService.logSuccess).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable error (rate_limit) on the same provider before succeeding", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured
      .mockRejectedValueOnce({ status: 429, message: "Too many requests" })
      .mockResolvedValueOnce(fakeResult("gemini"));

    const router = new AIRouter(gemini, openai, { baseDelayMs: 1, maxDelayMs: 2 });
    const result = await router.generate(fakeSupabase, fakeRequest());

    expect(result.provider).toBe("gemini");
    expect(gemini.generateStructured).toHaveBeenCalledTimes(2);
    expect(openai.generateStructured).not.toHaveBeenCalled();
  });

  it("falls back to openai when gemini is quota-exceeded", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured.mockRejectedValue({ status: 429, message: "quota exceeded" });
    openai.generateStructured.mockResolvedValue(fakeResult("openai"));

    const router = new AIRouter(gemini, openai, { baseDelayMs: 1, maxDelayMs: 2, maxRetriesPerProvider: 1 });
    const result = await router.generate(fakeSupabase, fakeRequest());

    expect(result.provider).toBe("openai");
    expect(openai.generateStructured).toHaveBeenCalledTimes(1);
  });

  it("does not fall back on a terminal auth_error", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured.mockRejectedValue({ status: 401, message: "Invalid API key" });

    const router = new AIRouter(gemini, openai, { baseDelayMs: 1, maxDelayMs: 2 });

    await expect(router.generate(fakeSupabase, fakeRequest())).rejects.toBeInstanceOf(AIProviderFailureError);
    expect(gemini.generateStructured).toHaveBeenCalledTimes(1);
    expect(openai.generateStructured).not.toHaveBeenCalled();
  });

  it("throws AIProviderFailureError when every provider is exhausted", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured.mockRejectedValue({ status: 503, message: "down" });
    openai.generateStructured.mockRejectedValue({ status: 503, message: "down" });

    const router = new AIRouter(gemini, openai, { baseDelayMs: 1, maxDelayMs: 2, maxRetriesPerProvider: 0 });

    await expect(router.generate(fakeSupabase, fakeRequest())).rejects.toBeInstanceOf(AIProviderFailureError);
  });

  it("blocks the call before touching any provider once the budget is exceeded", async () => {
    vi.mocked(AIUsageService.checkBudget).mockResolvedValue({
      allowed: false,
      monthToDateSpendUsd: 5,
      percentUsed: 166,
      settings: makeSettings({ hard_block_at_budget: true, monthly_budget_usd: 3 }),
    });
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");

    const router = new AIRouter(gemini, openai);

    await expect(router.generate(fakeSupabase, fakeRequest())).rejects.toBeInstanceOf(BudgetExceededError);
    expect(gemini.generateStructured).not.toHaveBeenCalled();
    expect(openai.generateStructured).not.toHaveBeenCalled();
  });

  it("respects gemini_only provider mode and never calls openai even on failure", async () => {
    allowBudget({ provider_mode: "gemini_only" });
    const gemini = makeProvider("gemini");
    const openai = makeProvider("openai");
    gemini.generateStructured.mockRejectedValue({ status: 429, message: "quota exceeded" });

    const router = new AIRouter(gemini, openai, { maxRetriesPerProvider: 0, baseDelayMs: 1, maxDelayMs: 2 });

    await expect(router.generate(fakeSupabase, fakeRequest())).rejects.toBeInstanceOf(AIProviderFailureError);
    expect(openai.generateStructured).not.toHaveBeenCalled();
  });

  it("skips an unconfigured provider instead of calling it", async () => {
    allowBudget();
    const gemini = makeProvider("gemini");
    gemini.isConfigured.mockReturnValue(false);
    const openai = makeProvider("openai");
    openai.generateStructured.mockResolvedValue(fakeResult("openai"));

    const router = new AIRouter(gemini, openai);
    const result = await router.generate(fakeSupabase, fakeRequest());

    expect(result.provider).toBe("openai");
    expect(gemini.generateStructured).not.toHaveBeenCalled();
  });
});
