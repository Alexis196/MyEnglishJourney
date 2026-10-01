"use client";

import { AlertCircle } from "lucide-react";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import type { DashboardSummary } from "@myenglishjourney/shared";

export function RecentErrorsList({ errors }: { errors: DashboardSummary["recentErrors"] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-ink">Últimos errores detectados</h3>
      {errors.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="Sin errores registrados todavía"
          description="A medida que completes ejercicios, vamos a registrar acá los errores recurrentes para reforzarlos."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {errors.map((error) => (
            <li key={error.id} className="rounded-xl bg-tint p-3 text-sm">
              <p className="text-faint line-through">{error.originalText}</p>
              <p className="font-medium text-ink">{error.correctedText}</p>
              <p className="mt-1 text-xs text-muted">{error.explanation}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
