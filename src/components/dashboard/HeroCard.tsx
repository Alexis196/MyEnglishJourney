"use client";

import { ArrowRight } from "lucide-react";
import type { DashboardSummary } from "@myenglishjourney/shared";
import { ArtworkCard } from "../ui/ArtworkCard";
import { ProgressBar } from "../ui/ProgressBar";
import { PrimaryLink } from "../ui/PrimaryButton";

/** Dashboard hero: the copy lives on the left, the illustration (book, flag, headphones) on the right. */
export function HeroCard({ summary }: { summary: DashboardSummary }) {
  const progress = summary.progressPercent ?? 0;

  return (
    <ArtworkCard
      art="hero"
      artPositionClassName="bg-[position:85%_50%] @xl:bg-right"
      contentClassName="@xl:max-w-[52%] @xl:py-9"
      scrim="soft"
      featured
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--hero-eyebrow)]">Continuá tu camino</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--hero-title)] @xl:text-4xl">
            Día {summary.currentDay} de{" "}
            <span className="bg-[image:var(--hero-accent-img)] bg-clip-text text-[color:var(--hero-accent-text)]">
              {summary.totalDays}
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-[var(--hero-text)]">Tu meta está cada vez más cerca 🚀</p>
        </div>

        <div className="max-w-sm">
          <div className="mb-1.5 flex items-center justify-between text-sm text-[var(--hero-text)]">
            <span>Progreso general</span>
            <span className="font-semibold tabular-nums">{progress}%</span>
          </div>
          <ProgressBar
            value={progress}
            trackClassName="dark:bg-white/20"
            barClassName="dark:bg-none dark:bg-white dark:shadow-none"
            aria-label="Progreso del programa de 90 días"
          />
        </div>

        {summary.nextLesson && (
          <PrimaryLink
            href={`/program/lessons/${summary.nextLesson.lessonId}`}
            tone="hero"
            className="w-fit"
          >
            Continuar aprendiendo
            <ArrowRight
              className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </PrimaryLink>
        )}
      </div>
    </ArtworkCard>
  );
}
