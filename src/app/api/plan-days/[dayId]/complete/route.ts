import { after } from "next/server";
import { authedRoute } from "@/server/http/handler";
import { lessonEngineService } from "@/server/services/lessons/lessonEngine.service";
import { planDayProgressService } from "@/server/services/planDayProgress.service";

export const maxDuration = 120;

/** Rest days have no lesson, so the student confirms them here; this unlocks the next day. */
export const POST = authedRoute<undefined, { dayId: string }>(
  { services: ["supabase"] },
  async ({ supabase, user, params }) => {
    const completion = await planDayProgressService.completeRestDay(supabase, user.id, params.dayId);
    if (completion.unlockedDayNumber) {
      const { learningPlanId, unlockedDayNumber } = completion;
      after(() => lessonEngineService.prepareDay(supabase, user.id, learningPlanId, unlockedDayNumber));
    }
    return { success: true };
  },
);
