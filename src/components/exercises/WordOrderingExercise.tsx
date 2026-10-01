"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ExercisePublic } from "@myenglishjourney/shared";
import { cn } from "../../utils/cn";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "word_ordering" }>;
  /** The chosen words joined with spaces (kept by the parent; the picked positions live here). */
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const chip =
  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed";

/** Tap the words in order to build the sentence; tap a placed word to take it back. */
export function WordOrderingExercise({ exercise, value, onChange, disabled }: Props) {
  const words = exercise.content.words;
  // Positions in the word bank, in the order the student picked them (words can repeat, so we track indexes).
  const [picked, setPicked] = useState<number[]>([]);

  const update = (next: number[]) => {
    setPicked(next);
    onChange(next.map((index) => words[index]).join(" "));
  };

  const remaining = useMemo(() => words.map((_, index) => index).filter((index) => !picked.includes(index)), [words, picked]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-ink">{exercise.content.prompt ?? "Ordená las palabras para formar la frase."}</p>

      <div
        aria-label="Tu frase"
        className="flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-dashed border-line-strong bg-soft p-2.5"
      >
        {picked.length === 0 && <span className="px-1 text-sm text-faint">Tocá las palabras en orden…</span>}
        {picked.map((index, position) => (
          <button
            key={`${index}-${position}`}
            type="button"
            disabled={disabled}
            onClick={() => update(picked.filter((_, i) => i !== position))}
            className={cn(chip, "border-primary/40 bg-primary/10 text-ink")}
            aria-label={`Quitar ${words[index]}`}
          >
            {words[index]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Palabras disponibles">
        {remaining.map((index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => update([...picked, index])}
            className={cn(chip, "border-line-strong bg-card text-ink hover:bg-hover")}
          >
            {words[index]}
          </button>
        ))}
      </div>

      {picked.length > 0 && !disabled && (
        <button
          type="button"
          onClick={() => update([])}
          className="inline-flex w-fit items-center gap-1 text-xs text-muted hover:text-ink-2"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> Empezar de nuevo
        </button>
      )}
    </div>
  );
}
