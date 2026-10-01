"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LessonDetail, UpdateLessonProgressInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiClient.get<LessonDetail>(`/api/lessons/${lessonId}`),
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
