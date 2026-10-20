import { describe, expect, it } from "vitest";
import { LEARNED_INTERVAL_DAYS, previewIntervals, scheduleReview, type ReviewState } from "./spacedRepetition";

const fresh: ReviewState = { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
const NOW = new Date("2026-10-20T10:00:00Z");
const days = (result: { nextReviewAt: Date }) => (result.nextReviewAt.getTime() - NOW.getTime()) / 86_400_000;

describe("spaced repetition scheduling", () => {
  it("brings a forgotten word back in minutes, resets its progress and marks it difficult", () => {
    const result = scheduleReview({ easeFactor: 2.5, intervalDays: 30, repetitions: 5 }, "again", "learned", NOW);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.learningStatus).toBe("difficult");
    expect(result.nextReviewAt.getTime() - NOW.getTime()).toBe(10 * 60_000);
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("spaces a remembered word further apart each time: 1 day, 3 days, then growing", () => {
    const first = scheduleReview(fresh, "good", "pending", NOW);
    expect(days(first)).toBe(1);
    const second = scheduleReview(first, "good", "pending", NOW);
    expect(days(second)).toBe(3);
    const third = scheduleReview(second, "good", "pending", NOW);
    expect(third.intervalDays).toBeGreaterThan(second.intervalDays);
    expect(third.repetitions).toBe(3);
  });

  it("easy words jump ahead and hard ones grow slowly", () => {
    const state: ReviewState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3 };
    const hard = scheduleReview(state, "hard", "pending", NOW).intervalDays;
    const good = scheduleReview(state, "good", "pending", NOW).intervalDays;
    const easy = scheduleReview(state, "easy", "pending", NOW).intervalDays;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
    expect(hard).toBeGreaterThan(state.intervalDays);
  });

  it("never lets the ease factor fall below the floor, however many times the word is forgotten", () => {
    let state: ReviewState = fresh;
    for (let i = 0; i < 20; i += 1) state = scheduleReview(state, "again", "difficult", NOW);
    expect(state.easeFactor).toBe(1.3);
  });

  it("marks a word as learned once its next review is weeks away", () => {
    let state: ReviewState = fresh;
    let status: "pending" | "learned" | "difficult" = "pending";
    for (let i = 0; i < 12 && status !== "learned"; i += 1) {
      const next = scheduleReview(state, "easy", status, NOW);
      state = next;
      status = next.learningStatus;
    }
    expect(status).toBe("learned");
    expect(state.intervalDays).toBeGreaterThanOrEqual(LEARNED_INTERVAL_DAYS);
  });

  it("a difficult word stays difficult after a merely 'hard' answer and recovers after a good one", () => {
    expect(scheduleReview({ easeFactor: 2, intervalDays: 1, repetitions: 1 }, "hard", "difficult", NOW).learningStatus).toBe("difficult");
    expect(scheduleReview({ easeFactor: 2, intervalDays: 1, repetitions: 1 }, "good", "difficult", NOW).learningStatus).toBe("pending");
  });

  it("previews the wait for each button so the student knows what each answer means", () => {
    expect(previewIntervals(fresh, "pending")).toEqual({ again: "10 min", hard: "1 día", good: "1 día", easy: "3 días" });
  });
});
