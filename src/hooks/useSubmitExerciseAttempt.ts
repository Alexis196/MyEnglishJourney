"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ExerciseAttemptResult, SubmitExerciseAttemptInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useSubmitExerciseAttempt(exerciseId: string, lessonId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitExerciseAttemptInput) =>
      apiClient.post<ExerciseAttemptResult>(`/api/exercises/${exerciseId}/attempts`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
