"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GradientCard } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import type { DashboardSummary } from "@myenglishjourney/shared";

export function HeroCard({ summary, fullName }: { summary: DashboardSummary; fullName?: string }) {
  const greeting = fullName ? `Hola, ${fullName.split(" ")[0]}` : "Hola";

  return (
    <GradientCard className="relative overflow-hidden">
      <div className="relative z-10 flex flex-col gap-4">
        <div>
          <p className="text-sm text-white/80">{greeting}, seguí con tu programa</p>
          <h2 className="mt-1 text-2xl font-semibold">
            Día {summary.currentDay} de {summary.totalDays}
          </h2>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm text-white/80">
            <span>Progreso general</span>
            <span>{summary.progressPercent}%</span>
          </div>
          <ProgressBar
            value={summary.progressPercent ?? 0}
            trackClassName="bg-white/20"
            barClassName="bg-white"
            aria-label="Progreso del programa de 90 días"
          />
        </div>

        {summary.nextLesson && (
          <Link
            href={`/program/lessons/${summary.nextLesson.lessonId}`}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-soft transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Continuar aprendiendo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 -left-6 h-40 w-40 rounded-full bg-white/10" />
    </GradientCard>
  );
}
