import { useQuery } from "@tanstack/react-query";
import type { DashboardSummary } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiClient.get<DashboardSummary>("/api/dashboard/summary"),
  });
}
