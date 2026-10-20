import { translateLiveTurnSchema, type TranslateLiveTurnInput } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { liveSpeakingService } from "@/server/services/liveSpeaking.service";

// A short text-model call: translates one tutor sentence while the conversation is open.
export const maxDuration = 30;

export const POST = authedRoute<TranslateLiveTurnInput, { sessionId: string }>(
  { services: ["supabase", "gemini"], schema: translateLiveTurnSchema },
  ({ supabase, user, body, params }) => liveSpeakingService.translate(supabase, user.id, params.sessionId, body),
);
