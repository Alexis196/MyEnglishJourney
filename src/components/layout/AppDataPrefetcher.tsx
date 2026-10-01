"use client";

import { useEffect } from "react";
import { useIsRestoring, useQueryClient } from "@tanstack/react-query";
import {
  currentPlanQuery,
  dashboardSummaryQuery,
  lessonQuery,
  planListQuery,
  profileQuery,
} from "../../lib/queries";

/**
 * Warms the cache for every main tab as soon as the user is signed in, so moving between
 * Dashboard / Programa / Perfil shows data immediately instead of waiting on a request each time.
 * Renders nothing; failures are ignored (each page still fetches its own data when it needs it).
 */
export function AppDataPrefetcher() {
  const queryClient = useQueryClient();
  const isRestoring = useIsRestoring();

  useEffect(() => {
    // Wait for the persisted cache to be restored first; otherwise everything would be fetched again after a reload.
    if (isRestoring) return;
    // The next lesson is known from the dashboard summary, so it is ready before the student taps "Continuar".
    void queryClient.prefetchQuery(dashboardSummaryQuery).then(() => {
      const nextLessonId = queryClient.getQueryData(dashboardSummaryQuery.queryKey)?.nextLesson?.lessonId;
      if (nextLessonId) void queryClient.prefetchQuery(lessonQuery(nextLessonId));
    });
    void queryClient.prefetchQuery(currentPlanQuery);
    void queryClient.prefetchQuery(planListQuery);
    void queryClient.prefetchQuery(profileQuery);
  }, [queryClient, isRestoring]);

  return null;
}
