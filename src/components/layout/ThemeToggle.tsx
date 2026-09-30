"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import { cn } from "../../utils/cn";

const options = [
  { value: "light" as const, icon: Sun, label: "Claro" },
  { value: "system" as const, icon: Monitor, label: "Sistema" },
  { value: "dark" as const, icon: Moon, label: "Oscuro" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900"
      role="radiogroup"
      aria-label="Preferencia de tema"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            theme === value
              ? "bg-brand-gradient text-white"
              : "text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
