import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("../repositories/learningPlan.repository", () => ({
  learningPlanRepository: {
    getById: vi.fn(),
    getCurrentForUser: vi.fn(),
    getActiveForUser: vi.fn(),
    listForUser: vi.fn(),
    setStatus: vi.fn(),
  },
}));
vi.mock("../repositories/planDay.repository", () => ({
  planDayRepository: { listForPlan: vi.fn(async () => []), countCompletedByPlan: vi.fn(async () => new Map()) },
}));
vi.mock("../repositories/profile.repository", () => ({
  profileRepository: { getById: vi.fn(), update: vi.fn() },
}));

const { learningPlanRepository } = await import("../repositories/learningPlan.repository");
const { profileRepository } = await import("../repositories/profile.repository");
const { learningPlanService } = await import("./learningPlan.service");
const { NotFoundError } = await import("../utils/AppError");

const supabase = {} as SupabaseClient;

function planRow(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    user_id: "user-1",
    title: `Plan ${id}`,
    status: "active",
    total_days: 90,
    start_date: "2026-01-01",
    target_level_start: "A2",
    target_level_end: "B1",
    generated_by: "ai",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("learningPlanService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(profileRepository.getById).mockResolvedValue({ id: "user-1", current_plan_id: "p1" } as never);
  });

  it("selects one of the user's own plans", async () => {
    vi.mocked(learningPlanRepository.getById).mockResolvedValue(planRow("p2") as never);
    vi.mocked(learningPlanRepository.getCurrentForUser).mockResolvedValue(planRow("p2") as never);

    const result = await learningPlanService.select(supabase, "user-1", "p2");

    expect(profileRepository.update).toHaveBeenCalledWith(supabase, "user-1", { current_plan_id: "p2" });
    expect(result.plan?.id).toBe("p2");
  });

  it("refuses to select a plan that belongs to someone else", async () => {
    vi.mocked(learningPlanRepository.getById).mockResolvedValue(planRow("p9", { user_id: "intruder" }) as never);
    await expect(learningPlanService.select(supabase, "user-1", "p9")).rejects.toBeInstanceOf(NotFoundError);
    expect(profileRepository.update).not.toHaveBeenCalled();
  });

  it("refuses to select an archived plan", async () => {
    vi.mocked(learningPlanRepository.getById).mockResolvedValue(planRow("p3", { status: "archived" }) as never);
    await expect(learningPlanService.select(supabase, "user-1", "p3")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("falls back to another active plan when the selected one is archived", async () => {
    vi.mocked(learningPlanRepository.getById).mockResolvedValue(planRow("p1") as never);
    vi.mocked(learningPlanRepository.getActiveForUser).mockResolvedValue(planRow("p2") as never);
    vi.mocked(learningPlanRepository.getCurrentForUser).mockResolvedValue(planRow("p2") as never);

    await learningPlanService.archive(supabase, "user-1", "p1");

    expect(learningPlanRepository.setStatus).toHaveBeenCalledWith(supabase, "p1", "archived");
    expect(profileRepository.update).toHaveBeenCalledWith(supabase, "user-1", { current_plan_id: "p2" });
  });

  it("clears the selected plan when none is left after archiving", async () => {
    vi.mocked(learningPlanRepository.getById).mockResolvedValue(planRow("p1") as never);
    vi.mocked(learningPlanRepository.getActiveForUser).mockResolvedValue(null);
    vi.mocked(learningPlanRepository.getCurrentForUser).mockResolvedValue(null);

    const result = await learningPlanService.archive(supabase, "user-1", "p1");

    expect(profileRepository.update).toHaveBeenCalledWith(supabase, "user-1", { current_plan_id: null });
    expect(result.plan).toBeNull();
  });

  it("marks the current plan in the list", async () => {
    vi.mocked(learningPlanRepository.listForUser).mockResolvedValue([planRow("p2"), planRow("p1")] as never);
    vi.mocked(learningPlanRepository.getCurrentForUser).mockResolvedValue(planRow("p1") as never);

    const { plans } = await learningPlanService.list(supabase, "user-1");

    expect(plans.map((p) => [p.id, p.isCurrent])).toEqual([
      ["p2", false],
      ["p1", true],
    ]);
  });
});
