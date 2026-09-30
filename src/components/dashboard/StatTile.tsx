"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "primary" | "secondary";
}

export function StatTile({ icon: Icon, label, value, tone = "primary" }: StatTileProps) {
  return (
    <Card className="flex items-center gap-3">
      <div
        className={
          tone === "primary"
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"
        }
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      </div>
    </Card>
  );
}
