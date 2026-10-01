"use client";

import { LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthProvider";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut } = useAuth();
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-white/[0.06] dark:bg-surface-dark/80 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 truncate text-sm text-muted">
          {displayName && (
            <span>
              Hola, <span className="font-medium text-zinc-900 dark:text-ink">{displayName}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-zinc-100 dark:hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Salir
        </button>
      </div>
    </header>
  );
}
