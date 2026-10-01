import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./queryClient";

/** Persisted data older than this is discarded instead of restored. */
export const CACHE_MAX_AGE = 24 * 60 * 60_000;

/** A new deployment starts with an empty persisted cache, so a changed API shape can never be misread. */
export const CACHE_BUSTER = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? "dev";

const STORAGE_PREFIX = "mej-query-cache:";
const PERSIST_THROTTLE_MS = 1000;

/** One persisted cache per user, so accounts sharing a browser never see each other's data. */
export function createUserPersister(userId: string) {
  return createSyncStoragePersister({
    storage: typeof window === "undefined" ? undefined : window.localStorage,
    key: `${STORAGE_PREFIX}${userId}`,
    throttleTime: PERSIST_THROTTLE_MS,
  });
}

function removePersistedCaches() {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith(STORAGE_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // storage unavailable (private mode) — nothing persisted to remove
  }
}

// undefined = no auth state seen yet in this page load.
let currentOwner: string | null | undefined;

/**
 * Call whenever the signed-in user is (re)resolved. When the user changes or signs out, the in-memory
 * cache is dropped, and on sign-out the persisted caches are wiped too.
 */
export function syncCacheOwner(userId: string | null) {
  if (currentOwner === userId) return;
  const hadOwner = currentOwner !== undefined;
  currentOwner = userId;

  // First resolution of this page load: memory is empty, keep the persisted cache of the same user.
  if (hadOwner) queryClient.clear();
  if (userId === null) {
    removePersistedCaches();
    // The persister writes on a throttle: it may still flush once more right after the clear above,
    // so wipe again once that last write has landed.
    setTimeout(removePersistedCaches, PERSIST_THROTTLE_MS + 500);
  }
}
