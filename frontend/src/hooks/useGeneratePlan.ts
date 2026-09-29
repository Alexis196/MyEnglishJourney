import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CurrentLearningPlanResponse, GeneratePlanRequest } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useGeneratePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GeneratePlanRequest) =>
      apiClient.post<CurrentLearningPlanResponse>("/api/learning-plan/generate", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-plan", "current"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
    },
  });
}
