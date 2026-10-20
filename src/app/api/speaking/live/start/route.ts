import { startLiveSpeakingSchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { liveSpeakingService } from "@/server/services/liveSpeaking.service";

// Creates the session and a one-use Gemini Live token; the audio itself never goes through the server.
export const POST = authedRoute(
  { services: ["supabase", "gemini"], schema: startLiveSpeakingSchema, status: 201 },
  ({ supabase, user, body }) => liveSpeakingService.start(supabase, user.id, body),
);
