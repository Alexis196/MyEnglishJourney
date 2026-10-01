"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EnsureLessonResponse } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

const POLL_MS = 3000;

/** Asks the server to make sure the day has its lesson. Idempotent: repeating it never generates twice. */
export function useEnsureDayLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => apiClient.post<EnsureLessonResponse>(`/api/plan-days/${dayId}/lesson`),
    onSuccess: (result) => {
      if (result.status === "ready") {
        void queryClient.invalidateQueries({ queryKey: ["learning-plan"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      }
    },
  });
}

/** Status only (never starts a generation); polls while another request is generating the lesson. */
export function useDayLessonStatus(dayId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["plan-day-lesson", dayId],
    queryFn: () => apiClient.get<EnsureLessonResponse>(`/api/plan-days/${dayId}/lesson`),
    enabled: enabled && Boolean(dayId),
    refetchInterval: POLL_MS,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCompleteRestDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dayId: string) => apiClient.post<{ success: true }>(`/api/plan-days/${dayId}/complete`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["learning-plan"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
