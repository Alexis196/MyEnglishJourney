import { updateLessonProgressSchema, type UpdateLessonProgressInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { lessonService } from "@/server/services/lesson.service";

export const POST = authedRoute<UpdateLessonProgressInput, { lessonId: string }>(
  { services: ["supabase"], schema: updateLessonProgressSchema },
  async ({ supabase, body, params }) => {
    await lessonService.updateProgress(supabase, params.lessonId, body);
    return { success: true };
  },
);
