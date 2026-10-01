"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "primary" | "secondary";
}

export function StatCard({ icon: Icon, label, value, tone = "primary" }: StatCardProps) {
  return (
    <Card
      className={cn(
        "flex items-center gap-3 transition-all duration-200",
        "motion-safe:hover:-translate-y-0.5 dark:hover:border-white/10",
        tone === "primary" ? "dark:hover:shadow-glow" : "dark:hover:shadow-glow-violet",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone === "primary"
            ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-[#6FA0FF]"
            : "bg-secondary/10 text-secondary dark:bg-secondary/15 dark:text-[#A78BFA]",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-ink">{value}</p>
      </div>
    </Card>
  );
}
