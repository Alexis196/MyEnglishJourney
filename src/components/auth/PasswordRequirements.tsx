"use client";

import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES, evaluatePassword } from "@myenglishjourney/shared";
import { cn } from "../../utils/cn";

const LEVEL_STYLES: Record<number, { text: string; bar: string }> = {
  1: { text: "text-[var(--auth-error)]", bar: "bg-[var(--auth-error)]" },
  2: { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  3: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  4: { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
};

/** Live strength meter + checklist for a new password. Purely presentational: validation lives in the shared schema. */
export function PasswordRequirements({ value, id }: { value: string; id?: string }) {
  const { level, label, met } = evaluatePassword(value);
  const styles = LEVEL_STYLES[level];

  return (
    <div id={id} className="flex flex-col gap-2.5 rounded-[14px] border border-[var(--auth-divider)] bg-[var(--auth-input-bg)] p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200",
                level >= segment && styles ? styles.bar : "bg-[var(--auth-divider)]",
              )}
            />
          ))}
        </div>
        <span className={cn("min-w-[4.5rem] text-right text-xs font-semibold", styles?.text)} aria-live="polite">
          {label ? <>Seguridad: {label}</> : null}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2" aria-label="Requisitos de la contraseña">
        {PASSWORD_RULES.map((rule) => {
          const ok = met[rule.id];
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-2 text-[13px] leading-snug transition-colors duration-200",
                ok ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--auth-muted)]",
              )}
            >
              {ok ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <Circle className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />}
              <span>
                {rule.label}
                <span className="sr-only">{ok ? " (cumplido)" : " (pendiente)"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
