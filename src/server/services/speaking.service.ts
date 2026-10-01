import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakingSessionResult, SubmitSpeakingRecordingInput } from "@myenglishjourney/shared";
import { speakingFeedbackSchema } from "@myenglishjourney/shared";
import { profileRepository } from "../repositories/profile.repository";
import { speakingSessionRepository } from "../repositories/speakingSession.repository";
import { aiRouter, buildSpeakingAnalysisSystemPrompt, buildSpeakingAnalysisUserPrompt } from "./ai/index";
import { AIProviderFailureError } from "./ai/AIRouter";
import { AppError, BudgetExceededError } from "../utils/AppError";
import { logger } from "../utils/logger";

const BUCKET = "speaking-audio";

export const speakingService = {
  async submitRecording(
    supabase: SupabaseClient,
    userId: string,
    input: SubmitSpeakingRecordingInput,
  ): Promise<SpeakingSessionResult> {
    // The client uploads straight to Storage; only accept paths inside the caller's own folder
    // (Storage RLS enforces this too, but rejecting early gives a clear 400).
    const path = input.audioPath;
    if (!path.startsWith(`${userId}/`) || path.includes("..")) {
      throw new AppError("Ruta de audio inválida", 400, "invalid_audio_path");
    }

    const { data: audioBlob, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
    if (downloadError || !audioBlob) {
      throw new AppError("No se encontró la grabación subida", 400, "audio_not_found");
    }
    const audioBase64 = Buffer.from(await audioBlob.arrayBuffer()).toString("base64");

    const session = await speakingSessionRepository.create(supabase, {
      userId,
      audioStoragePath: path,
      durationSeconds: input.durationSeconds,
      usedTranslation: input.usedTranslation ?? false,
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
        audio: { mimeType: input.mimeType, base64Data: audioBase64 },
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
