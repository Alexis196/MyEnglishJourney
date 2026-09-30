"use client";

import { useMutation } from "@tanstack/react-query";
import type { SpeakingSessionResult, SubmitSpeakingRecordingInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";

const BUCKET = "speaking-audio";

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
};

export interface SpeakingSubmission extends Omit<SubmitSpeakingRecordingInput, "audioPath"> {
  blob: Blob;
}

/**
 * Uploads the recording straight to Supabase Storage (RLS keeps it inside the
 * user's own folder) and then asks the API to analyze it by path. This keeps the
 * API request tiny, avoiding the serverless body-size limit on long recordings.
 */
export function useSubmitSpeakingRecording() {
  return useMutation({
    mutationFn: async ({ blob, ...rest }: SpeakingSubmission) => {
      if (!supabase) throw new Error("Supabase is not configured");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("No autenticado");

      const extension = EXTENSION_BY_MIME_TYPE[rest.mimeType] ?? "bin";
      const audioPath = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(audioPath, blob, {
        contentType: rest.mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      return apiClient.post<SpeakingSessionResult>("/api/speaking/sessions", { ...rest, audioPath });
    },
  });
}
