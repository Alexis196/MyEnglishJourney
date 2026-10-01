import { z } from "zod";
import { speakingFeedbackSchema } from "./ai.schema";

export const speakingSessionStatusSchema = z.enum(["recorded", "transcribing", "analyzed", "failed"]);
export type SpeakingSessionStatus = z.infer<typeof speakingSessionStatusSchema>;

const SUPPORTED_AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"] as const;

/**
 * The browser uploads the recording straight to the private "speaking-audio"
 * Storage bucket (RLS-scoped to "<user_id>/...") and sends only its path here,
 * so the request body stays tiny regardless of recording length.
 */
export const submitSpeakingRecordingSchema = z.object({
  question: z.string().min(1).max(500),
  mimeType: z.enum(SUPPORTED_AUDIO_MIME_TYPES),
  durationSeconds: z.number().int().min(1).max(300),
  audioPath: z.string().min(1).max(300),
  /** True when the student revealed the Spanish translation of the question before answering. */
  usedTranslation: z.boolean().optional(),
});
export type SubmitSpeakingRecordingInput = z.infer<typeof submitSpeakingRecordingSchema>;

export const speakingSessionResultSchema = z.object({
  id: z.string().uuid(),
  status: speakingSessionStatusSchema,
  transcript: z.string().nullable(),
  aiFeedback: speakingFeedbackSchema.nullable(),
  createdAt: z.string(),
});
export type SpeakingSessionResult = z.infer<typeof speakingSessionResultSchema>;
