import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planDayRepository } from "./planDay.repository";

/** Records the PostgREST builder calls so we can assert the claim is ONE conditional UPDATE. */
function recordingClient(rows: unknown[]) {
  const calls: Array<[string, unknown[]]> = [];
  const builder: Record<string, unknown> = {};
  for (const method of ["update", "eq", "is", "or", "select"]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push([method, args]);
      return method === "select" ? Promise.resolve({ data: rows, error: null }) : builder;
    });
  }
  const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
  return { client, calls };
}

describe("planDayRepository.claimGeneration", () => {
  it("is a single conditional UPDATE limited to claimable states", async () => {
    const { client, calls } = recordingClient([{ id: "day-2" }]);
    const claimed = await planDayRepository.claimGeneration(client, "day-2", { staleBefore: "2026-01-01T00:00:00.000Z", nextAttempt: 2 });

    expect(claimed).toEqual({ id: "day-2" });
    expect(calls.map(([method]) => method)).toEqual(["update", "eq", "is", "or", "select"]);
    expect(calls[0]![1][0]).toMatchObject({ generation_status: "generating", generation_attempts: 2, generation_error: null });
    expect(calls[2]![1]).toEqual(["lesson_id", null]); // never re-claim a day that already has its lesson
    const condition = calls[3]![1][0] as string;
    expect(condition).toContain("generation_status.in.(pending,failed)");
    expect(condition).toContain("generation_status.eq.generating,generation_started_at.lt.2026-01-01T00:00:00.000Z");
  });

  it("returns null when somebody else already holds the day", async () => {
    const { client } = recordingClient([]);
    await expect(planDayRepository.claimGeneration(client, "day-2", { staleBefore: "x", nextAttempt: 1 })).resolves.toBeNull();
  });
});
