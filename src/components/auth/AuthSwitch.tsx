"use client";

import Link from "next/link";

/** "Don't have an account? Sign up" style footer, separated from the form by a hairline. */
export function AuthSwitch({ prompt, href, action }: { prompt: string; href: string; action: string }) {
  return (
    <div className="mt-6 border-t border-[var(--auth-divider)] pt-5 text-center text-sm text-[var(--auth-muted)]">
      <p>{prompt}</p>
      <Link
        href={href}
        className="mt-1 inline-block rounded-md px-1 font-semibold text-[var(--auth-link)] transition-colors duration-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {action}
      </Link>
    </div>
  );
}
