"use client";

import { Archive, Plus } from "lucide-react";
import { MAX_OPEN_PLANS, type LearningPlanSummary } from "@myenglishjourney/shared";
import { Badge } from "../ui/Badge";
import { ProgressBar } from "../ui/ProgressBar";
import { useArchivePlan, useSelectPlan } from "../../hooks/useLearningPlans";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";

interface PlanSwitcherProps {
  plans: LearningPlanSummary[];
  onCreateNew: () => void;
}

export function PlanSwitcher({ plans, onCreateNew }: PlanSwitcherProps) {
  const selectPlan = useSelectPlan();
  const archivePlan = useArchivePlan();
  const { showToast } = useToast();

  const busy = selectPlan.isPending || archivePlan.isPending;
  const atLimit = plans.length >= MAX_OPEN_PLANS;

  const handleSelect = async (plan: LearningPlanSummary) => {
    if (plan.isCurrent || busy) return;
    try {
      await selectPlan.mutateAsync(plan.id);
      showToast(`Ahora estás con "${plan.title}"`, "success");
    } catch {
      showToast("No se pudo cambiar de plan. Intentá de nuevo.", "error");
    }
  };

  const handleArchive = async (plan: LearningPlanSummary) => {
    if (busy) return;
    const confirmed = window.confirm(
      `¿Archivar "${plan.title}"? Dejará de aparecer en tu lista de planes (tu progreso no se borra).`,
    );
    if (!confirmed) return;
    try {
      await archivePlan.mutateAsync(plan.id);
      showToast("Plan archivado", "success");
    } catch {
      showToast("No se pudo archivar el plan.", "error");
    }
  };

  return (
    <section aria-label="Mis planes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Mis planes <span className="font-normal text-muted">({plans.length}/{MAX_OPEN_PLANS})</span>
        </h2>
        <button
          type="button"
          onClick={onCreateNew}
          disabled={atLimit || busy}
          title={atLimit ? `Máximo ${MAX_OPEN_PLANS} planes activos: archivá alguno para crear otro` : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium transition-colors dark:border-zinc-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            atLimit || busy
              ? "cursor-not-allowed text-muted opacity-60"
              : "text-primary hover:bg-primary/5 dark:hover:bg-primary/10",
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo plan
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const percent = plan.totalDays > 0 ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border border-zinc-200 bg-white shadow-soft dark:border-zinc-800 dark:bg-surface-card-dark dark:shadow-soft-dark",
                plan.isCurrent && "border-primary/50 ring-1 ring-primary/30",
              )}
            >
              <button
                type="button"
                onClick={() => handleSelect(plan)}
                disabled={busy}
                aria-pressed={plan.isCurrent}
                className="flex w-full flex-col gap-2 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-2 pr-8">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{plan.title}</span>
                  {plan.isCurrent && <Badge tone="brand">Actual</Badge>}
                </div>
                <p className="text-xs text-muted">
                  {plan.targetLevelStart ?? "?"} → {plan.targetLevelEnd ?? "?"} · {plan.completedDays}/{plan.totalDays}{" "}
                  días
                </p>
                <ProgressBar value={percent} aria-label={`Progreso de ${plan.title}`} />
              </button>
              <button
                type="button"
                onClick={() => handleArchive(plan)}
                disabled={busy}
                aria-label={`Archivar ${plan.title}`}
                title="Archivar plan"
                className="absolute right-2 top-2 rounded-lg p-1.5 text-muted hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
