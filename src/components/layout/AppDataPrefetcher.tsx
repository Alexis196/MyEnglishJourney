"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { currentPlanQuery, dashboardSummaryQuery, planListQuery, profileQuery } from "../../lib/queries";

/**
 * Warms the cache for every main tab as soon as the user is signed in, so moving between
 * Dashboard / Programa / Perfil shows data immediately instead of waiting on a request each time.
 * Renders nothing; failures are ignored (each page still fetches its own data when it needs it).
 */
export function AppDataPrefetcher() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery(dashboardSummaryQuery);
    void queryClient.prefetchQuery(currentPlanQuery);
    void queryClient.prefetchQuery(planListQuery);
    void queryClient.prefetchQuery(profileQuery);
  }, [queryClient]);

  return null;
}
