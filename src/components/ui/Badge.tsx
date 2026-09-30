"use client";

import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  brand: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
