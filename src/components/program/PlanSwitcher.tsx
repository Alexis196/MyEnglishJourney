"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Plus, Trash2 } from "lucide-react";
import { MAX_OPEN_PLANS, type LearningPlanSummary } from "@myenglishjourney/shared";
import { Badge } from "../ui/Badge";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/ProgressBar";
import { useArchivePlan, useDeletePlan, useSelectPlan, useUnarchivePlan } from "../../hooks/useLearningPlans";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";

interface PlanSwitcherProps {
  plans: LearningPlanSummary[];
  onCreateNew: () => void;
}

const iconButton =
  "absolute top-[15px] flex h-6 w-6 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function PlanSwitcher({ plans: allPlans, onCreateNew }: PlanSwitcherProps) {
  const selectPlan = useSelectPlan();
  const archivePlan = useArchivePlan();
  const unarchivePlan = useUnarchivePlan();
  const deletePlan = useDeletePlan();
  const { showToast } = useToast();
  // The plan stays set while the dialog animates out, so its title does not vanish mid-transition.
  const [planToArchive, setPlanToArchive] = useState<LearningPlanSummary | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<LearningPlanSummary | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const plans = allPlans.filter((plan) => plan.status !== "archived");
  const archived = allPlans.filter((plan) => plan.status === "archived");

  const busy = selectPlan.isPending || archivePlan.isPending || unarchivePlan.isPending || deletePlan.isPending;
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

  const handleUnarchive = async (plan: LearningPlanSummary) => {
    if (busy) return;
    try {
      await unarchivePlan.mutateAsync(plan.id);
      showToast(`"${plan.title}" volvió a tus planes`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "No se pudo restaurar el plan.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete || deletePlan.isPending) return;
    try {
      await deletePlan.mutateAsync(planToDelete.id);
      showToast("Plan eliminado", "success");
    } catch {
      showToast("No se pudo eliminar el plan.", "error");
    } finally {
      setDeleteOpen(false);
    }
  };

  const askDelete = (plan: LearningPlanSummary) => {
    setPlanToDelete(plan);
    setDeleteOpen(true);
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
          title={atLimit ? `Máximo ${MAX_OPEN_PLANS} planes activos: archivá o eliminá alguno para crear otro` : undefined}
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
                <div className="flex items-start justify-between gap-2 pr-16">
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
                onClick={() => askDelete(plan)}
                disabled={busy}
                aria-label={`Eliminar ${plan.title}`}
                title="Eliminar plan"
                className={cn(iconButton, "right-10 hover:text-red-500")}
              >
                <Trash2 className="h-4 w-4" />
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
                className={cn(iconButton, "right-3")}
              >
                <Archive className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {archived.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            aria-expanded={showArchived}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg text-xs font-medium text-muted hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showArchived && "rotate-180")} aria-hidden="true" />
            Archivados ({archived.length})
          </button>

          {showArchived && (
            <ul className="flex flex-col gap-2">
              {archived.map((plan) => (
                <li
                  key={plan.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-soft px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-2">{plan.title}</p>
                    <p className="text-xs text-muted">
                      {plan.targetLevelStart ?? "?"} → {plan.targetLevelEnd ?? "?"} · {plan.completedDays}/{plan.totalDays}{" "}
                      días
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnarchive(plan)}
                      disabled={busy || atLimit}
                      title={atLimit ? "Alcanzaste el máximo de planes activos" : undefined}
                    >
                      <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> Restaurar
                    </Button>
                    <button
                      type="button"
                      onClick={() => askDelete(plan)}
                      disabled={busy}
                      aria-label={`Eliminar ${plan.title}`}
                      title="Eliminar plan"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={archiveOpen}
        icon={Archive}
        title="¿Archivar este plan?"
        description={
          <>
            <strong className="font-semibold text-ink">{planToArchive?.title}</strong> dejará de aparecer en tu lista de
            planes. Tu progreso no se borra y podés restaurarlo cuando quieras.
          </>
        }
        confirmLabel="Archivar"
        isLoading={archivePlan.isPending}
        onConfirm={handleConfirmArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        icon={Trash2}
        title="¿Eliminar este plan?"
        description={
          <>
            <strong className="font-semibold text-ink">{planToDelete?.title}</strong> se elimina con todos sus días y
            lecciones. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar"
        isLoading={deletePlan.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </section>
  );
}
