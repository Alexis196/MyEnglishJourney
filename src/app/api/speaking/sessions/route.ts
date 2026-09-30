import { submitSpeakingRecordingSchema } from "@myenglishjourney/shared";
import { authedRoute } from "@/server/http/handler";
import { speakingService } from "@/server/services/speaking.service";

// Downloads the recording, runs Gemini audio analysis and stores the result.
export const maxDuration = 120;

export const POST = authedRoute(
  { services: ["supabase", "gemini"], schema: submitSpeakingRecordingSchema, status: 201 },
  ({ supabase, user, body }) => speakingService.submitRecording(supabase, user.id, body),
);
