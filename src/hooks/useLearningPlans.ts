"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CurrentLearningPlanResponse } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";
import { planListQuery } from "../lib/queries";

export function useLearningPlans() {
  return useQuery(planListQuery);
}

/** Switching or archiving a plan changes what the program page, lessons and dashboard show. */
function useInvalidatePlanQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["learning-plan"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  };
}

export function useSelectPlan() {
  const invalidate = useInvalidatePlanQueries();
  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.post<CurrentLearningPlanResponse>(`/api/learning-plan/${planId}/select`),
    onSuccess: invalidate,
  });
}

export function useArchivePlan() {
  const invalidate = useInvalidatePlanQueries();
  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.post<CurrentLearningPlanResponse>(`/api/learning-plan/${planId}/archive`),
    onSuccess: invalidate,
  });
}
