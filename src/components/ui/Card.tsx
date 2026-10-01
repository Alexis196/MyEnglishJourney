"use client";

import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft",
        "dark:border-white/[0.06] dark:bg-surface-card-dark dark:shadow-soft-dark",
        className,
      )}
      {...props}
    />
  );
}

export function GradientCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-brand-gradient p-5 text-white shadow-glow", className)} {...props} />;
}
