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

/**
 * Segmented control. Colours come from the --seg-* tokens, so light and dark share one component.
 * `vertical` stacks the options for narrow spaces such as the collapsed sidebar rail.
 */
export function ThemeToggle({ vertical = false }: { vertical?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-[var(--seg-border)] bg-[var(--seg-bg)] p-1",
        vertical && "flex-col",
      )}
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
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--seg-bg)]",
            theme === value
              ? "[background:var(--seg-active)] text-[var(--seg-active-text)] shadow-[var(--seg-active-shadow)]"
              : "text-[var(--seg-text)] hover:bg-hover hover:text-ink",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
