"use client";

import { useState } from "react";
import { Archive, Plus } from "lucide-react";
import { MAX_OPEN_PLANS, type LearningPlanSummary } from "@myenglishjourney/shared";
import { Badge } from "../ui/Badge";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Button } from "../ui/Button";
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
  // The plan stays set while the dialog animates out, so its title does not vanish mid-transition.
  const [planToArchive, setPlanToArchive] = useState<LearningPlanSummary | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

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

  const handleConfirmArchive = async () => {
    if (!planToArchive || archivePlan.isPending) return;
    try {
      await archivePlan.mutateAsync(planToArchive.id);
      showToast("Plan archivado", "success");
    } catch {
      showToast("No se pudo archivar el plan.", "error");
    } finally {
      setArchiveOpen(false);
    }
  };

  return (
    <section aria-label="Mis planes" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">
          Mis planes <span className="font-normal text-muted">({plans.length}/{MAX_OPEN_PLANS})</span>
        </h2>
        <Button
          type="button"
          size="sm"
          onClick={onCreateNew}
          disabled={atLimit || busy}
          title={atLimit ? `Máximo ${MAX_OPEN_PLANS} planes activos: archivá alguno para crear otro` : undefined}
          className="rounded-xl px-3.5 shadow-glow motion-safe:hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden="true" /> Nuevo plan
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const percent = plan.totalDays > 0 ? Math.round((plan.completedDays / plan.totalDays) * 100) : 0;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-2xl border border-line bg-card shadow-card",
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
                  <span className="text-sm font-semibold text-ink">{plan.title}</span>
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
                onClick={() => {
                  setPlanToArchive(plan);
                  setArchiveOpen(true);
                }}
                disabled={busy}
                aria-label={`Archivar ${plan.title}`}
                title="Archivar plan"
                className="absolute right-2 top-2 rounded-lg p-1.5 text-muted hover:bg-hover hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={archiveOpen}
        icon={Archive}
        title="¿Archivar este plan?"
        description={
          <>
            <strong className="font-semibold text-ink">{planToArchive?.title}</strong> dejará de aparecer en tu lista de
            planes. Tu progreso no se borra.
          </>
        }
        confirmLabel="Archivar"
        isLoading={archivePlan.isPending}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveOpen(false)}
      />
    </section>
  );
}
