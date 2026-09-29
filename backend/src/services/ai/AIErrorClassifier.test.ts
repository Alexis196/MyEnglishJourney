import { describe, expect, it } from "vitest";
import { AIErrorClassifier, AIInvalidResponseError, AISafetyBlockError } from "./AIErrorClassifier.js";

describe("AIErrorClassifier", () => {
  it("classifies a 429 with 'quota' in the message as quota_exceeded (fallback-eligible, not retryable-forever)", () => {
    const result = AIErrorClassifier.classify({ status: 429, message: "Quota exceeded for this project" }, "gemini");
    expect(result.category).toBe("quota_exceeded");
    expect(result.fallbackEligible).toBe(true);
  });

  it("classifies a plain 429 as rate_limit (retryable and fallback-eligible)", () => {
    const result = AIErrorClassifier.classify({ status: 429, message: "Too many requests" }, "openai");
    expect(result.category).toBe("rate_limit");
    expect(result.retryable).toBe(true);
    expect(result.fallbackEligible).toBe(true);
  });

  it("classifies OpenAI's insufficient_quota code as quota_exceeded", () => {
    const result = AIErrorClassifier.classify({ status: 429, code: "insufficient_quota", message: "insufficient_quota" }, "openai");
    expect(result.category).toBe("quota_exceeded");
  });

  it("classifies 401/403 as auth_error — terminal, never retried or fallen back", () => {
    const result401 = AIErrorClassifier.classify({ status: 401, message: "Invalid API key" }, "gemini");
    const result403 = AIErrorClassifier.classify({ status: 403, message: "Forbidden" }, "openai");
    for (const result of [result401, result403]) {
      expect(result.category).toBe("auth_error");
      expect(result.retryable).toBe(false);
      expect(result.fallbackEligible).toBe(false);
    }
  });

  it("classifies 400 as invalid_request — terminal", () => {
    const result = AIErrorClassifier.classify({ status: 400, message: "Bad request" }, "gemini");
    expect(result.category).toBe("invalid_request");
    expect(result.retryable).toBe(false);
    expect(result.fallbackEligible).toBe(false);
  });

  it("classifies 500/503 as server_error — retryable and fallback-eligible", () => {
    const result = AIErrorClassifier.classify({ status: 503, message: "Service unavailable" }, "gemini");
    expect(result.category).toBe("server_error");
    expect(result.retryable).toBe(true);
    expect(result.fallbackEligible).toBe(true);
  });

  it("classifies AISafetyBlockError as safety_block — terminal, no fallback", () => {
    const result = AIErrorClassifier.classify(new AISafetyBlockError(), "gemini");
    expect(result.category).toBe("safety_block");
    expect(result.retryable).toBe(false);
    expect(result.fallbackEligible).toBe(false);
  });

  it("classifies AIInvalidResponseError (bad model JSON) as invalid_request — terminal for that provider", () => {
    const result = AIErrorClassifier.classify(new AIInvalidResponseError(), "openai");
    expect(result.category).toBe("invalid_request");
    expect(result.retryable).toBe(false);
    expect(result.fallbackEligible).toBe(false);
  });

  it("falls back to 'unknown' for unrecognized errors without a status", () => {
    const result = AIErrorClassifier.classify(new Error("something odd happened"), "gemini");
    expect(result.category).toBe("unknown");
    expect(result.retryable).toBe(false);
    expect(result.fallbackEligible).toBe(false);
  });
});
