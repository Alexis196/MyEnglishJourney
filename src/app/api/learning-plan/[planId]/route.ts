import { authedRoute } from "@/server/http/handler";
import { learningPlanService } from "@/server/services/learningPlan.service";

export const DELETE = authedRoute<undefined, { planId: string }>(
  { services: ["supabase"] },
  ({ supabase, user, params }) => learningPlanService.remove(supabase, user.id, params.planId),
);
