"use client";

import { AlertCircle } from "lucide-react";

/** Form-level error (e.g. wrong credentials returned by the server), shown inline instead of an alert(). */
export function AuthAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[14px] border border-[var(--auth-error-border)] bg-[var(--auth-error-bg)] px-3.5 py-3 text-sm leading-snug text-[var(--auth-error)]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
