"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Profile, UpdateProfileInput } from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";

export function useProfile() {
  return useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => apiClient.get<Profile>("/api/auth/me"),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => apiClient.patch<Profile>("/api/auth/me", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
