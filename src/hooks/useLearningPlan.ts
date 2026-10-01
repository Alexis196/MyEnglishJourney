"use client";

import { useQuery } from "@tanstack/react-query";
import { currentPlanQuery } from "../lib/queries";

export function useLearningPlan() {
  return useQuery(currentPlanQuery);
}
