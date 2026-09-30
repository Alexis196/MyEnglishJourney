"use client";

import type { ExercisePublic } from "@myenglishjourney/shared";
import { cn } from "../../utils/cn";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "multiple_choice" }>;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function MultipleChoiceExercise({ exercise, value, onChange, disabled }: Props) {
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-1 text-base font-medium text-zinc-900 dark:text-zinc-100">
        {exercise.content.prompt}
      </legend>
      {exercise.content.options.map((option, index) => (
        <label
          key={index}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors",
            "focus-within:ring-2 focus-within:ring-primary",
            value === index
              ? "border-primary bg-primary/5 dark:bg-primary/10"
              : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800",
          )}
        >
          <input
            type="radio"
            name={`exercise-${exercise.id}`}
            className="h-4 w-4 accent-primary"
            checked={value === index}
            onChange={() => onChange(index)}
          />
          <span className="text-zinc-800 dark:text-zinc-200">{option}</span>
        </label>
      ))}
    </fieldset>
  );
}
