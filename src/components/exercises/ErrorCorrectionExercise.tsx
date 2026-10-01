"use client";

import { useEffect } from "react";
import type { ExercisePublic } from "@myenglishjourney/shared";
import { Input } from "../ui/Input";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "grammar_error_correction" }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** The student edits a sentence that has one mistake and rewrites it correctly. */
export function ErrorCorrectionExercise({ exercise, value, onChange, disabled }: Props) {
  const original = exercise.content.sentenceWithError;

  // Start from the faulty sentence so the student edits it instead of retyping everything.
  useEffect(() => {
    if (value === "") onChange(original);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-ink">{exercise.content.prompt ?? "Esta frase tiene un error. Escribila bien."}</p>
      <p className="rounded-xl bg-tint px-3.5 py-2.5 text-sm text-ink-2 line-through decoration-amber-500/70">{original}</p>
      <Input
        aria-label="Frase corregida"
        placeholder="Escribí la frase corregida"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
