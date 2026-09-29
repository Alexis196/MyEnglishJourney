import { z } from "zod";
import { speakingFeedbackSchema } from "./ai.schema.js";

export const speakingSessionStatusSchema = z.enum(["recorded", "transcribing", "analyzed", "failed"]);
export type SpeakingSessionStatus = z.infer<typeof speakingSessionStatusSchema>;

const SUPPORTED_AUDIO_MIME_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav", "audio/mpeg"] as const;

/**
 * audioBase64 is capped well above any realistic spoken answer (a few minutes
 * of opus-encoded speech is a few hundred KB) to block obviously abusive
 * payloads without needing a separate multipart upload pipeline.
 */
export const submitSpeakingRecordingSchema = z.object({
  question: z.string().min(1).max(500),
  mimeType: z.enum(SUPPORTED_AUDIO_MIME_TYPES),
  durationSeconds: z.number().int().min(1).max(300),
  audioBase64: z.string().min(1).max(8_000_000),
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
