"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardSummaryQuery } from "../lib/queries";

export function useDashboardSummary() {
  return useQuery(dashboardSummaryQuery);
}
