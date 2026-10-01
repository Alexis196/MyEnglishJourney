"use client";

import type { ExercisePublic } from "@myenglishjourney/shared";
import { cn } from "../../utils/cn";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "free_writing" }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FreeWritingExercise({ exercise, value, onChange, disabled }: Props) {
  const wordCount = value.trim().length === 0 ? 0 : value.trim().split(/\s+/).length;
  const minWords = exercise.content.minWords ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-zinc-900 dark:text-ink">{exercise.content.prompt}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={5}
        placeholder="Escribí tu respuesta en inglés..."
        className={cn(
          "rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900",
          "dark:border-white/10 dark:bg-surface-raised-dark dark:text-ink",
          "focus:outline-none focus:ring-2 focus:ring-primary resize-y",
        )}
      />
      {minWords > 0 && (
        <p className={cn("text-xs", wordCount >= minWords ? "text-emerald-600" : "text-muted")}>
          {wordCount}/{minWords} palabras mínimas
        </p>
      )}
      <p className="text-xs text-muted">Tu respuesta va a ser evaluada por IA, considerando distintas formas válidas de expresarla.</p>
    </div>
  );
}
