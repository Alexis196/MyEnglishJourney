"use client";

import { useState } from "react";
import type { ExercisePublic, ExerciseResponse } from "@myenglishjourney/shared";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { MultipleChoiceExercise } from "./MultipleChoiceExercise";
import { FillInBlankExercise } from "./FillInBlankExercise";
import { TranslationExercise } from "./TranslationExercise";
import { FreeWritingExercise } from "./FreeWritingExercise";
import { ExerciseResultFeedback } from "./ExerciseResultFeedback";
import { useSubmitExerciseAttempt } from "../../hooks/useSubmitExerciseAttempt";
import { useToast } from "../../context/ToastProvider";

const UNIMPLEMENTED_TYPES = new Set([
  "word_ordering",
  "reading_comprehension",
  "listening_comprehension",
  "sentence_construction",
  "grammar_error_correction",
]);

export function ExerciseRenderer({ exercise, lessonId }: { exercise: ExercisePublic; lessonId: string }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const { showToast } = useToast();
  const submitAttempt = useSubmitExerciseAttempt(exercise.id, lessonId);

  if (UNIMPLEMENTED_TYPES.has(exercise.exerciseType)) {
    return (
      <Card className="border-dashed text-sm text-muted">
        Este tipo de ejercicio ({exercise.exerciseType.replace(/_/g, " ")}) está planificado para una próxima
        iteración.
      </Card>
    );
  }

  const canSubmit =
    exercise.exerciseType === "multiple_choice" ? selectedOption !== null : textAnswer.trim().length > 0;

  const handleSubmit = async () => {
    let response: ExerciseResponse;
    if (exercise.exerciseType === "multiple_choice" && selectedOption !== null) {
      response = { exerciseType: "multiple_choice", selectedOptionIndex: selectedOption };
    } else if (
      exercise.exerciseType === "fill_in_blank" ||
      exercise.exerciseType === "translation_es_en" ||
      exercise.exerciseType === "translation_en_es" ||
      exercise.exerciseType === "free_writing"
    ) {
      response = { exerciseType: exercise.exerciseType, answer: textAnswer };
    } else {
      return;
    }

    try {
      await submitAttempt.mutateAsync({ response });
    } catch {
      showToast("No se pudo enviar tu respuesta. Intentá de nuevo.", "error");
    }
  };

  const isDisabled = submitAttempt.isPending || submitAttempt.isSuccess;

  return (
    <Card className="flex flex-col gap-4">
      {exercise.exerciseType === "multiple_choice" && (
        <MultipleChoiceExercise exercise={exercise} value={selectedOption} onChange={setSelectedOption} disabled={isDisabled} />
      )}
      {exercise.exerciseType === "fill_in_blank" && (
        <FillInBlankExercise exercise={exercise} value={textAnswer} onChange={setTextAnswer} disabled={isDisabled} />
      )}
      {(exercise.exerciseType === "translation_es_en" || exercise.exerciseType === "translation_en_es") && (
        <TranslationExercise exercise={exercise} value={textAnswer} onChange={setTextAnswer} disabled={isDisabled} />
      )}
      {exercise.exerciseType === "free_writing" && (
        <FreeWritingExercise exercise={exercise} value={textAnswer} onChange={setTextAnswer} disabled={isDisabled} />
      )}

      {submitAttempt.data ? (
        <ExerciseResultFeedback result={submitAttempt.data} />
      ) : (
        <Button onClick={handleSubmit} disabled={!canSubmit} isLoading={submitAttempt.isPending} className="w-fit">
          Comprobar respuesta
        </Button>
      )}
    </Card>
  );
}
