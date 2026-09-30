import { submitExerciseAttemptSchema, type SubmitExerciseAttemptInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { exerciseService } from "@/server/services/exercise.service";

// Only Supabase is required here, not AI: closed-answer exercise types never touch
// the AI provider layer, and free_writing degrades gracefully (see exercise.service).
// free_writing can still wait on an LLM, hence the raised duration.
export const maxDuration = 60;

export const POST = authedRoute<SubmitExerciseAttemptInput, { exerciseId: string }>(
  { services: ["supabase"], schema: submitExerciseAttemptSchema, status: 201 },
  ({ supabase, user, body, params }) =>
    exerciseService.submitAttempt(supabase, user.id, params.exerciseId, body.response),
);
