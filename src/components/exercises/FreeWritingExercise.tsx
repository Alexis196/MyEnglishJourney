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
  const starters = exercise.content.starters ?? [];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-ink">{exercise.content.prompt}</p>
      {starters.length > 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Inicios de frase">
          <span className="text-xs text-muted">Podés empezar con:</span>
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => onChange(value.trim() === "" ? `${starter} ` : `${value.trimEnd()}\n${starter} `)}
              className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {starter}…
            </button>
          ))}
        </div>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={minWords > 0 && minWords <= 20 ? 3 : 5}
        placeholder="Escribí tu respuesta en inglés..."
        className={cn(
          "rounded-xl border border-line-strong bg-soft px-3.5 py-2.5 text-sm text-ink",
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
