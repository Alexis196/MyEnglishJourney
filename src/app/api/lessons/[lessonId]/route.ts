import { authedRoute } from "@/server/http/handler";
import { lessonService } from "@/server/services/lesson.service";

export const GET = authedRoute<undefined, { lessonId: string }>(
  { services: ["supabase"] },
  ({ supabase, user, params }) => lessonService.getForUser(supabase, user.id, params.lessonId),
);
