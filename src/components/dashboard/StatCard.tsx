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
        "[--shadow-card:var(--shadow-stat)] transition-all duration-200 hover:shadow-hover motion-safe:hover:-translate-y-0.5 dark:hover:border-white/10",
        tone === "secondary" && "dark:hover:shadow-glow-violet",
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          tone === "primary"
            ? "bg-primary/10 text-link dark:bg-primary/15"
            : "bg-secondary/10 text-secondary-text dark:bg-secondary/15",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-lg font-semibold text-ink">{value}</p>
      </div>
    </Card>
  );
}
