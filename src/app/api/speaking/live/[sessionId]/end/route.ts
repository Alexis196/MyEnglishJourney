import { endLiveSpeakingSchema, type EndLiveSpeakingInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { liveSpeakingService } from "@/server/services/liveSpeaking.service";

// Stores the transcript and runs the post-conversation analysis with the text model.
export const maxDuration = 60;

export const POST = authedRoute<EndLiveSpeakingInput, { sessionId: string }>(
  { services: ["supabase", "gemini"], schema: endLiveSpeakingSchema },
  ({ supabase, user, body, params }) => liveSpeakingService.end(supabase, user.id, params.sessionId, body),
);
