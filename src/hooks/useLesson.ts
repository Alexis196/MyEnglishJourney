"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateLessonProgressInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";
import { lessonQuery } from "../lib/queries";

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    // Placeholder id is never fetched: `enabled` keeps the query idle until the id is known.
    ...lessonQuery(lessonId ?? ""),
    enabled: Boolean(lessonId),
  });
}

export function useUpdateLessonProgress(lessonId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLessonProgressInput) =>
      apiClient.post<{ success: true }>(`/api/lessons/${lessonId}/progress`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["learning-plan"] });
    },
  });
}
