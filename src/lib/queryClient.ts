import { QueryClient } from "@tanstack/react-query";

/** How long a cached response may be reused without asking the server again. */
export const STALE = {
  /** Changes with the student's activity. */
  activity: 2 * 60_000,
  /** Changes only when the student creates/switches/archives plans. */
  plans: 5 * 60_000,
  /** Changes only from the profile screen. */
  profile: 10 * 60_000,
  /** Lesson content is fixed once generated; progress mutations invalidate it explicitly. */
  lesson: 10 * 60_000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mutations invalidate what they change, so cached data can be reused for a while;
      // switching tabs then shows content instantly instead of hitting the network (and Supabase).
      staleTime: STALE.activity,
      // Must be >= the persisted cache max age, otherwise restored entries are garbage-collected.
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
