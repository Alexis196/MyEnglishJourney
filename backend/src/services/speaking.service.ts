import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakingSessionResult, SubmitSpeakingRecordingInput } from "@myenglishjourney/shared";
import { speakingFeedbackSchema } from "@myenglishjourney/shared";
import { profileRepository } from "../repositories/profile.repository.js";
import { speakingSessionRepository } from "../repositories/speakingSession.repository.js";
import { aiRouter, buildSpeakingAnalysisSystemPrompt, buildSpeakingAnalysisUserPrompt } from "./ai/index.js";
import { AIProviderFailureError } from "./ai/AIRouter.js";
import { BudgetExceededError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

const BUCKET = "speaking-audio";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
};

export const speakingService = {
  async submitRecording(
    supabase: SupabaseClient,
    userId: string,
    input: SubmitSpeakingRecordingInput,
  ): Promise<SpeakingSessionResult> {
    const audioBuffer = Buffer.from(input.audioBase64, "base64");
    const extension = EXTENSION_BY_MIME_TYPE[input.mimeType] ?? "bin";
    const path = `${userId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, audioBuffer, {
      contentType: input.mimeType,
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const session = await speakingSessionRepository.create(supabase, {
      userId,
      audioStoragePath: path,
      durationSeconds: input.durationSeconds,
    });

    try {
      const profile = await profileRepository.getById(supabase, userId);

      const aiResult = await aiRouter.generate(supabase, {
        activityType: "speaking_feedback",
        systemPrompt: buildSpeakingAnalysisSystemPrompt(profile.explanation_language),
        userPrompt: buildSpeakingAnalysisUserPrompt({ question: input.question }),
        responseSchema: speakingFeedbackSchema,
        userId,
        maxOutputTokens: 2048,
        audio: { mimeType: input.mimeType, base64Data: input.audioBase64 },
      });

      const updated = await speakingSessionRepository.updateResult(supabase, session.id, {
        transcript: aiResult.data.transcript,
        aiFeedback: aiResult.data,
        status: "analyzed",
      });

      return {
        id: updated.id,
        status: updated.status,
        transcript: updated.transcript,
        aiFeedback: aiResult.data,
        createdAt: updated.created_at,
      };
    } catch (error) {
      if (error instanceof AIProviderFailureError || error instanceof BudgetExceededError) {
        logger.warn({ err: error, userId, sessionId: session.id }, "Speaking analysis failed");
        const updated = await speakingSessionRepository.updateResult(supabase, session.id, { status: "failed" });
        return {
          id: updated.id,
          status: updated.status,
          transcript: null,
          aiFeedback: null,
          createdAt: updated.created_at,
        };
      }
      throw error;
    }
  },
};
