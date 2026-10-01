"use client";

import Link from "next/link";
import { Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-surface-light text-center dark:bg-surface-dark">
      <Compass className="h-10 w-10 text-primary" aria-hidden="true" />
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-ink">Página no encontrada</h1>
      <p className="text-sm text-muted">La página que buscás no existe o fue movida.</p>
      <Link
        href="/dashboard"
        className="mt-1 inline-flex items-center justify-center rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white shadow-soft hover:opacity-90"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
