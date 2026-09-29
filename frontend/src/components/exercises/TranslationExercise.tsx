import type { ExercisePublic } from "@myenglishjourney/shared";
import { Input } from "../ui/Input";

interface Props {
  exercise: Extract<ExercisePublic, { exerciseType: "translation_es_en" | "translation_en_es" }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TranslationExercise({ exercise, value, onChange, disabled }: Props) {
  const direction = exercise.exerciseType === "translation_es_en" ? "Español → Inglés" : "English → Spanish";

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary">{direction}</p>
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">{exercise.content.sourceText}</p>
      <Input
        placeholder="Escribí la traducción"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
