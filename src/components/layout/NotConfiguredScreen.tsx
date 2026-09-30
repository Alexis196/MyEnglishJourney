"use client";

import { AlertTriangle } from "lucide-react";

export function NotConfiguredScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-light px-4 dark:bg-surface-dark">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-soft dark:border-amber-900/40 dark:bg-surface-card-dark">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Supabase no está configurado
        </h1>
        <p className="text-sm text-muted">
          Definí <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800">.env.local</code> para poder
          iniciar sesión. Consultá el README para los pasos exactos.
        </p>
      </div>
    </div>
  );
}
