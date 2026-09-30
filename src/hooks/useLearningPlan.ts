"use client";

import { useQuery } from "@tanstack/react-query";
import type { CurrentLearningPlanResponse } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useLearningPlan() {
  return useQuery({
    queryKey: ["learning-plan", "current"],
    queryFn: () => apiClient.get<CurrentLearningPlanResponse>("/api/learning-plan/current"),
  });
}
