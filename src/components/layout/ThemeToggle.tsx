"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeProvider";
import { cn } from "../../utils/cn";

// "system" follows the OS preference (prefers-color-scheme) — see ThemeProvider.
const options = [
  { value: "light" as const, icon: Sun, label: "Tema claro", short: "Claro" },
  { value: "system" as const, icon: Monitor, label: "Usar tema del sistema", short: "Auto" },
  { value: "dark" as const, icon: Moon, label: "Tema oscuro", short: "Oscuro" },
];

/**
 * Segmented control. Colours come from the --seg-* tokens, so light and dark share one component.
 * `vertical` stacks the options for narrow spaces such as the collapsed sidebar rail;
 * `block` fills the width and shows a text label under each icon so the choice is readable at a glance.
 */
export function ThemeToggle({ vertical = false, block = false }: { vertical?: boolean; block?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-[var(--seg-border)] bg-[var(--seg-bg)] p-1",
        vertical && "flex-col",
        block && "w-full rounded-2xl",
      )}
      role="radiogroup"
      aria-label="Preferencia de tema"
    >
      {options.map(({ value, icon: Icon, label, short }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            block ? "h-auto flex-1 flex-col gap-0.5 rounded-xl py-1.5 text-[11px] font-medium leading-none" : "h-7 w-7",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--seg-bg)]",
            theme === value
              ? "[background:var(--seg-active)] text-[var(--seg-active-text)] shadow-[var(--seg-active-shadow)]"
              : "text-[var(--seg-text)] hover:bg-hover hover:text-ink",
          )}
        >
          <Icon className={block ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />
          {block && <span>{short}</span>}
        </button>
      ))}
    </div>
  );
}
