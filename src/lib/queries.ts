import { queryOptions } from "@tanstack/react-query";
import type {
  CurrentLearningPlanResponse,
  DashboardSummary,
  LearningPlanListResponse,
  Profile,
} from "@myenglishjourney/shared";
import { apiClient } from "./apiClient";

/** Shared query definitions: the hooks read them and the app prefetches them, so keys never drift apart. */
export const dashboardSummaryQuery = queryOptions({
  queryKey: ["dashboard-summary"],
  queryFn: () => apiClient.get<DashboardSummary>("/api/dashboard/summary"),
});

export const currentPlanQuery = queryOptions({
  queryKey: ["learning-plan", "current"],
  queryFn: () => apiClient.get<CurrentLearningPlanResponse>("/api/learning-plan/current"),
});

export const planListQuery = queryOptions({
  queryKey: ["learning-plan", "list"],
  queryFn: () => apiClient.get<LearningPlanListResponse>("/api/learning-plan"),
});

export const profileQuery = queryOptions({
  queryKey: ["profile", "me"],
  queryFn: () => apiClient.get<Profile>("/api/auth/me"),
});
