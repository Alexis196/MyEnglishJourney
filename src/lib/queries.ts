import { queryOptions } from "@tanstack/react-query";
import type {
  CurrentLearningPlanResponse,
  DashboardSummary,
  LearningPlanListResponse,
  LessonDetail,
  Profile,
  VocabularyListResponse,
  VocabularyReviewQueue,
} from "@myenglishjourney/shared";
import { apiClient } from "./apiClient";
import { STALE } from "./queryClient";

/** Shared query definitions: the hooks read them and the app prefetches them, so keys never drift apart. */
export const dashboardSummaryQuery = queryOptions({
  queryKey: ["dashboard-summary"],
  queryFn: () => apiClient.get<DashboardSummary>("/api/dashboard/summary"),
});

export const currentPlanQuery = queryOptions({
  queryKey: ["learning-plan", "current"],
  queryFn: () => apiClient.get<CurrentLearningPlanResponse>("/api/learning-plan/current"),
  // Day statuses change as lessons are completed (those mutations invalidate this query).
  staleTime: STALE.activity,
});

export const planListQuery = queryOptions({
  // "all": the list now includes archived plans; a new key drops any list persisted with the old shape.
  queryKey: ["learning-plan", "list", "all"],
  queryFn: () => apiClient.get<LearningPlanListResponse>("/api/learning-plan"),
  staleTime: STALE.plans,
});

export const profileQuery = queryOptions({
  queryKey: ["profile", "me"],
  queryFn: () => apiClient.get<Profile>("/api/auth/me"),
  staleTime: STALE.profile,
});

export const lessonQuery = (lessonId: string) =>
  queryOptions({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiClient.get<LessonDetail>(`/api/lessons/${lessonId}`),
    staleTime: STALE.lesson,
  });

export const vocabularyListQuery = queryOptions({
  queryKey: ["vocabulary", "list"],
  queryFn: () => apiClient.get<VocabularyListResponse>("/api/vocabulary"),
  // Saving, editing, deleting and studying words all invalidate it.
  staleTime: STALE.activity,
});

/** Always fresh: what is due changes as the clock moves and as the student studies. */
export const vocabularyReviewQuery = queryOptions({
  queryKey: ["vocabulary", "review"],
  queryFn: () => apiClient.get<VocabularyReviewQueue>("/api/vocabulary/review"),
  staleTime: 0,
  gcTime: 0,
});
