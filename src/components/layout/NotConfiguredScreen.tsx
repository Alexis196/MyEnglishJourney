"use client";

import { AlertTriangle } from "lucide-react";

export function NotConfiguredScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-page px-4">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-card p-6 text-center shadow-card dark:border-amber-900/40">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-ink">
          Supabase no está configurado
        </h1>
        <p className="text-sm text-muted">
          Definí <code className="rounded bg-track px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="rounded bg-track px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en{" "}
          <code className="rounded bg-track px-1 py-0.5">.env.local</code> para poder
          iniciar sesión. Consultá el README para los pasos exactos.
        </p>
      </div>
    </div>
  );
}
