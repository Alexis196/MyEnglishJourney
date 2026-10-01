"use client";

import type { ExercisePublic } from "@myenglishjourney/shared";
import { Input } from "../ui/Input";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "fill_in_blank" }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function FillInBlankExercise({ exercise, value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-base font-medium text-ink">{exercise.content.prompt}</p>
      <Input
        placeholder="Escribí la palabra que falta"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
