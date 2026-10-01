"use client";

import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";
import { useProfile } from "../../hooks/useProfile";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  // Same query the app already prefetches, so this adds no request.
  const { data: profile } = useProfile();
  const level = profile?.currentLevel ?? null;
  // Profile name wins (editable), then the sign-up metadata; only the first word is shown.
  const fullName = profile?.fullName?.trim() || (user?.user_metadata?.full_name as string | undefined)?.trim() || "";
  const firstName = fullName.split(/\s+/)[0] ?? "";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-[var(--topbar-bg)] px-4 backdrop-blur-[12px] md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate text-sm text-muted">
          <span>
            Hola
            {firstName && (
              <>
                , <span className="font-medium text-ink">{firstName}</span>
              </>
            )}
          </span>
        </div>
      </div>

      {level && (
        <Link
          href="/profile"
          title="Tu nivel actual (CEFR). Tocá para editarlo en tu perfil"
          aria-label={`Nivel actual: ${level}. Ir al perfil`}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-link transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            <span className="max-[379px]:hidden">Nivel </span>
            {level}
          </span>
        </Link>
      )}
    </header>
  );
}
