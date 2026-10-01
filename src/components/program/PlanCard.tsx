"use client";

import { Flag, MountainSnow } from "lucide-react";
import { ArtworkCard } from "../ui/ArtworkCard";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";

interface PlanCardProps {
  title: string;
  startLevel: string | null;
  endLevel: string | null;
  totalDays: number;
  completedDays: number;
}

/** Main card of the program page: plan info on the left, the A2 -> B1 mountain route on the right. */
export function PlanCard({ title, startLevel, endLevel, totalDays, completedDays }: PlanCardProps) {
  const percent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  return (
    <ArtworkCard
      art="plan"
      artPositionClassName="bg-[position:80%_50%] @xl:bg-right"
      contentClassName="@xl:max-w-[54%] @xl:py-8"
      scrim="strong"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow ring-1 ring-inset ring-white/15">
            <MountainSnow className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-snug text-ink @xl:text-xl">{title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">
                {startLevel ?? "?"} → {endLevel ?? "?"}
              </Badge>
              <span className="text-xs text-muted">{totalDays} días</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">
              {completedDays} de {totalDays} días completados
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-ink">
              <Flag className="h-3.5 w-3.5 text-secondary-text" aria-hidden="true" />
              {percent}%
            </span>
          </div>
          <ProgressBar value={percent} aria-label={`Progreso del plan: ${percent}%`} />
        </div>
      </div>
    </ArtworkCard>
  );
}
