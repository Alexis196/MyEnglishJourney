"use client";

import { useMemo, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "../lib/queryClient";
import { CACHE_BUSTER, CACHE_MAX_AGE, createUserPersister } from "../lib/queryCache";
import { AuthProvider, useAuth } from "../context/AuthProvider";
import { ThemeProvider } from "../context/ThemeProvider";
import { ToastProvider } from "../context/ToastProvider";

/** Persists the query cache (per user) so a page reload can show data without waiting on the API. */
function PersistedCache({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const persister = useMemo(() => (userId ? createUserPersister(userId) : null), [userId]);

  if (!userId || !persister) return <>{children}</>;

  return (
    <PersistQueryClientProvider
      key={userId}
      client={queryClient}
      persistOptions={{ persister, maxAge: CACHE_MAX_AGE, buster: CACHE_BUSTER }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <PersistedCache>{children}</PersistedCache>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
