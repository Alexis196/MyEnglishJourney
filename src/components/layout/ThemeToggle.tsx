"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import { cn } from "../../utils/cn";

// "system" follows the OS preference (prefers-color-scheme) — see ThemeProvider.
const options = [
  { value: "light" as const, icon: Sun, label: "Tema claro" },
  { value: "system" as const, icon: Monitor, label: "Usar tema del sistema" },
  { value: "dark" as const, icon: Moon, label: "Tema oscuro" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-1 shadow-sm transition-colors duration-300 dark:border-white/[0.08] dark:bg-surface-raised-dark dark:shadow-none"
      role="radiogroup"
      aria-label="Preferencia de tema"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-raised-dark",
            theme === value
              ? "bg-brand-gradient text-white shadow-glow"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-[#9299AA] dark:hover:bg-white/[0.06] dark:hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
