"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateVocabularyInput,
  CreateVocabularyResponse,
  DetectVocabularyResponse,
  EnrichedWord,
  ReviewGradeInput,
  SavedWord,
  UpdateVocabularyInput,
} from "@myenglishjourney/shared";
import { apiClient } from "../lib/apiClient";
import { vocabularyListQuery, vocabularyReviewQuery } from "../lib/queries";

export function useVocabularyList() {
  return useQuery(vocabularyListQuery);
}

export function useVocabularyReview(enabled = true) {
  return useQuery({ ...vocabularyReviewQuery, enabled });
}

/** Words changed: the list, the study queue and the dashboard's word counter are all stale now. */
function useInvalidateVocabulary() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };
}

export function useSaveWord() {
  const invalidate = useInvalidateVocabulary();
  return useMutation({
    mutationFn: (input: Omit<CreateVocabularyInput, "source"> & { source: CreateVocabularyInput["source"] }) =>
      apiClient.post<CreateVocabularyResponse>("/api/vocabulary", input),
    onSuccess: invalidate,
  });
}

export function useUpdateWord() {
  const invalidate = useInvalidateVocabulary();
  return useMutation({
    mutationFn: ({ id, ...fields }: UpdateVocabularyInput & { id: string }) => apiClient.patch<SavedWord>(`/api/vocabulary/${id}`, fields),
    onSuccess: invalidate,
  });
}

export function useDeleteWord() {
  const invalidate = useInvalidateVocabulary();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ ok: true }>(`/api/vocabulary/${id}`),
    onSuccess: invalidate,
  });
}

export function useEnrichWord() {
  return useMutation({ mutationFn: (term: string) => apiClient.post<EnrichedWord>("/api/vocabulary/enrich", { term }) });
}

export function useDetectWords() {
  return useMutation({ mutationFn: (text: string) => apiClient.post<DetectVocabularyResponse>("/api/vocabulary/detect", { text }) });
}

/** Grading does not refresh the queue on purpose: the study screen walks its own batch without reshuffling. */
export function useGradeWord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, grade }: { id: string } & ReviewGradeInput) => apiClient.post<SavedWord>(`/api/vocabulary/${id}/review`, { grade }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vocabulary", "list"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
