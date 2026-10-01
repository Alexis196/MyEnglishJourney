"use client";

import Link from "next/link";
import { Lock, CheckCircle2, PlayCircle, Coffee, ClipboardCheck, BookOpenCheck } from "lucide-react";
import { useState } from "react";
import { useLearningPlan } from "../../hooks/useLearningPlan";
import { useQueryClient } from "@tanstack/react-query";
import { useLearningPlans } from "../../hooks/useLearningPlans";
import { lessonQuery } from "../../lib/queries";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { GeneratePlanForm } from "../../components/program/GeneratePlanForm";
import { PlanSwitcher } from "../../components/program/PlanSwitcher";
import { PlanCard } from "../../components/program/PlanCard";
import { cn } from "../../utils/cn";
import type { PlanDay } from "@myenglishjourney/shared";

const dayTypeIcon: Record<PlanDay["dayType"], typeof PlayCircle> = {
  lesson: PlayCircle,
  review: BookOpenCheck,
  rest: Coffee,
  assessment: ClipboardCheck,
};

function DayCell({ day }: { day: PlanDay }) {
  const Icon = day.status === "completed" ? CheckCircle2 : day.status === "locked" ? Lock : dayTypeIcon[day.dayType];
  // Open days link to their lesson, or to the day page that prepares it (and confirms rest days).
  const href =
    day.status === "locked"
      ? null
      : day.lessonId
        ? `/program/lessons/${day.lessonId}`
        : day.status === "completed"
          ? null
          : `/program/days/${day.id}`;
  const queryClient = useQueryClient();
  // Start loading the lesson as soon as the student points at / focuses the day.
  const warmLesson = () => {
    if (day.lessonId) void queryClient.prefetchQuery(lessonQuery(day.lessonId));
  };

  const content = (
    <div
      title={day.theme ?? undefined}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors",
        day.status === "completed" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/10 dark:text-emerald-400",
        day.status === "available" &&
          "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10",
        day.status === "locked" && "border-line bg-tint text-muted",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-semibold">Día {day.dayNumber}</span>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      onMouseEnter={warmLesson}
      onFocus={warmLesson}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
      {content}
    </Link>
  );
}

export function ProgramOverviewPage() {
  const { data, isLoading } = useLearningPlan();
  const { data: plansData } = useLearningPlans();
  const [creating, setCreating] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
      </div>
    );
  }

  if (creating && data?.plan) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-ink">Nuevo plan de 90 días</h1>
          <p className="mt-1 text-sm text-muted">
            Tus otros planes se conservan; podés cambiar entre ellos cuando quieras.
          </p>
        </div>
        <GeneratePlanForm onCreated={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </div>
    );
  }

  if (!data?.plan) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-ink">Creá tu programa de 90 días</h1>
          <p className="mt-1 text-sm text-muted">
            Contanos tu nivel y objetivos, y la IA arma tu plan personalizado.
          </p>
        </div>
        <GeneratePlanForm />
      </div>
    );
  }

  const weeks = Array.from(
    data.days.reduce((map, day) => {
      const list = map.get(day.weekNumber) ?? [];
      list.push(day);
      map.set(day.weekNumber, list);
      return map;
    }, new Map<number, PlanDay[]>()),
  ).sort(([a], [b]) => a - b);

  return (
    <div className="flex flex-col gap-6">
      <PlanCard
        title={data.plan.title}
        startLevel={data.plan.targetLevelStart}
        endLevel={data.plan.targetLevelEnd}
        totalDays={data.plan.totalDays}
        completedDays={data.days.filter((d) => d.status === "completed").length}
      />

      {plansData && plansData.plans.length > 0 && (
        <PlanSwitcher plans={plansData.plans} onCreateNew={() => setCreating(true)} />
      )}

      {weeks.map(([weekNumber, days]) => (
        <Card key={weekNumber}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Semana {weekNumber}</h2>
            <Badge tone="brand">{days.filter((d) => d.status === "completed").length}/{days.length} completados</Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {days
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((day) => (
                <DayCell key={day.id} day={day} />
              ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
