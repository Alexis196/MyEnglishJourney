import { authedRoute } from "@/server/http/handler";
import { learningPlanService } from "@/server/services/learningPlan.service";

export const GET = authedRoute({ services: ["supabase"] }, ({ supabase, user }) =>
  learningPlanService.list(supabase, user.id),
);
