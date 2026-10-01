import { authedRoute } from "@/server/http/handler";
import { learningPlanService } from "@/server/services/learningPlan.service";

export const POST = authedRoute<undefined, { planId: string }>(
  { services: ["supabase"] },
  ({ supabase, user, params }) => learningPlanService.unarchive(supabase, user.id, params.planId),
);
