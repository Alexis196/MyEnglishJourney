import { after } from "next/server";
import { updateLessonProgressSchema, type UpdateLessonProgressInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { lessonService } from "@/server/services/lesson.service";
import { lessonEngineService } from "@/server/services/lessons/lessonEngine.service";

// Completing a lesson also prepares the next one in the background (see after() below).
export const maxDuration = 120;

export const POST = authedRoute<UpdateLessonProgressInput, { lessonId: string }>(
  { services: ["supabase"], schema: updateLessonProgressSchema },
  async ({ supabase, user, body, params }) => {
    const completion = await lessonService.updateProgress(supabase, user.id, params.lessonId, body);

    // Day N is saved and N+1 is unlocked: answer right away and prepare N+1 after the response is sent,
    // so finishing a lesson never waits for the next one to be generated.
    if (completion?.unlockedDayNumber) {
      const { learningPlanId, unlockedDayNumber } = completion;
      after(() => lessonEngineService.prepareDay(supabase, user.id, learningPlanId, unlockedDayNumber));
    }
    return { success: true };
  },
);
