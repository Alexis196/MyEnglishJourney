import { authedRoute } from "@/server/http/handler";
import { dashboardService } from "@/server/services/dashboard.service";

export const GET = authedRoute({ services: ["supabase"] }, ({ supabase, user }) =>
  dashboardService.getSummary(supabase, user.id),
);
