"use client";

import { Menu } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-[var(--topbar-bg)] px-4 backdrop-blur-[12px] md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate text-sm text-muted">
          {displayName && (
            <span>
              Hola, <span className="font-medium text-ink">{displayName}</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
