import { generatePlanRequestSchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { planGenerationService } from "@/server/services/planGeneration.service";

// Plan generation waits on a full LLM response (with retries/fallback).
export const maxDuration = 120;

export const POST = authedRoute(
  { services: ["supabase", "ai"], schema: generatePlanRequestSchema, status: 201 },
  ({ supabase, user, body }) => planGenerationService.generate(supabase, user.id, body),
);
