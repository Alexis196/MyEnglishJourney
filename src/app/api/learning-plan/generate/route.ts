import { after } from "next/server";
import { generatePlanRequestSchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { planGenerationService } from "@/server/services/planGeneration.service";
import { lessonEngineService } from "@/server/services/lessons/lessonEngine.service";

// Plan generation waits on a full LLM response (with retries/fallback); day 1's lesson then runs after the response.
export const maxDuration = 120;

export const POST = authedRoute(
  { services: ["supabase", "ai"], schema: generatePlanRequestSchema, status: 201 },
  async ({ supabase, user, body }) => {
    const created = await planGenerationService.generate(supabase, user.id, body);

    // Start preparing day 1 right away without making the student wait for it; opening the day later is idempotent.
    if (created.plan) {
      const planId = created.plan.id;
      after(() => lessonEngineService.prepareDay(supabase, user.id, planId, 1));
    }
    return created;
  },
);
