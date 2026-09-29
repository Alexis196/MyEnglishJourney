import { useMutation } from "@tanstack/react-query";
import type { SpeakingSessionResult, SubmitSpeakingRecordingInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useSubmitSpeakingRecording() {
  return useMutation({
    mutationFn: (input: SubmitSpeakingRecordingInput) =>
      apiClient.post<SpeakingSessionResult>("/api/speaking/sessions", input),
  });
}
