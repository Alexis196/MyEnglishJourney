import { authedRoute } from "@/server/http/handler";
import { lessonEngineService } from "@/server/services/lessons/lessonEngine.service";

// A lesson is one structured LLM response (with retries / provider fallback), like plan generation.
export const maxDuration = 120;

/** Status only — never starts a generation. Used by the client to poll while another request generates. */
export const GET = authedRoute<undefined, { dayId: string }>(
  { services: ["supabase"] },
  ({ supabase, user, params }) => lessonEngineService.getStatus(supabase, user.id, params.dayId),
);

/** Makes sure the day has its lesson (idempotent): returns it, or starts exactly one generation. */
export const POST = authedRoute<undefined, { dayId: string }>(
  { services: ["supabase", "ai"] },
  ({ supabase, user, params }) => lessonEngineService.ensureLesson(supabase, user.id, params.dayId),
);
