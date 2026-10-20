"use client";

import { useState } from "react";
import { PartyPopper, RotateCcw } from "lucide-react";
import { previewIntervals, type Grade, type SavedWord } from "@myenglishjourney/shared";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { CardSkeleton } from "../ui/Skeleton";
import { useGradeWord, useVocabularyReview } from "../../hooks/useVocabulary";
import { useToast } from "../../context/ToastProvider";
import { SpeakButton } from "./SpeakButton";
import { cn } from "../../utils/cn";

const GRADES: Array<{ grade: Grade; label: string; style: string }> = [
  { grade: "again", label: "Otra vez", style: "border-red-400/50 text-red-500 hover:bg-red-500/10" },
  { grade: "hard", label: "Difícil", style: "border-amber-400/50 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400" },
  { grade: "good", label: "Bien", style: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: "easy", label: "Fácil", style: "border-emerald-400/50 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400" },
];

export function Flashcards({ onGoAdd }: { onGoAdd: () => void }) {
  const { data, isLoading, isError, refetch } = useVocabularyReview();

  if (isLoading) return <CardSkeleton />;
  if (isError || !data) {
    return (
      <Card>
        <p className="text-sm text-muted">No pudimos cargar tus tarjetas.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-3">
          Reintentar
        </Button>
      </Card>
    );
  }
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={PartyPopper}
        title="No tenés palabras para repasar ahora"
        description="Cuando guardes palabras nuevas o llegue el momento de repasar las que ya tenés, van a aparecer acá."
        action={
          <Button variant="outline" onClick={onGoAdd}>
            Agregar palabras
          </Button>
        }
      />
    );
  }

  // The study session owns its batch: the server queue is read once and not re-read while the student answers.
  return <Session initial={data.items} dueTotal={data.dueTotal} onAgain={() => void refetch()} onGoAdd={onGoAdd} />;
}

function Session({ initial, dueTotal, onAgain, onGoAdd }: { initial: SavedWord[]; dueTotal: number; onAgain: () => void; onGoAdd: () => void }) {
  const [queue, setQueue] = useState<SavedWord[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(0);
  // Words the student forgot: each one is shown a second time before the session ends.
  const [retried, setRetried] = useState<Set<string>>(new Set());
  const grade = useGradeWord();
  const { showToast } = useToast();

  const current = queue[0];

  if (!current) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <PartyPopper className="h-8 w-8 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-ink">¡Repaso terminado!</h2>
        <p className="text-sm text-muted">
          Repasaste {answered} {answered === 1 ? "palabra" : "palabras"}.
          {dueTotal > initial.length ? ` Te quedan ${dueTotal - initial.length} más para otro rato.` : ""}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {dueTotal > initial.length && (
            <Button onClick={onAgain}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Seguir repasando
            </Button>
          )}
          <Button variant="outline" onClick={onGoAdd}>
            Agregar palabras
          </Button>
        </div>
      </Card>
    );
  }

  const labels = previewIntervals(
    { easeFactor: 2.5, intervalDays: current.review.intervalDays, repetitions: current.review.repetitions },
    current.learningStatus,
  );

  const handleGrade = async (value: Grade) => {
    if (grade.isPending) return;
    try {
      await grade.mutateAsync({ id: current.id, grade: value });
    } catch {
      showToast("No se pudo guardar tu respuesta. Intentá de nuevo.", "error");
      return;
    }
    setAnswered((count) => count + 1);
    setRevealed(false);
    setQueue((prev) => {
      const [, ...rest] = prev;
      // A forgotten word comes back once more before the session ends.
      return value === "again" && !retried.has(current.id) ? [...rest, current] : rest;
    });
    if (value === "again") setRetried((prev) => new Set(prev).add(current.id));
  };

  const total = initial.length + retried.size;
  const done = Math.min(answered, total);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          Tarjeta {Math.min(done + 1, total)} de {total}
        </span>
        <span>{dueTotal} para repasar hoy</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Progreso del repaso">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
      </div>

      <Card className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="flex items-center gap-1 text-2xl font-semibold text-ink">
          {current.term}
          <SpeakButton text={current.term} className="h-8 w-8" />
        </p>

        {revealed ? (
          <div className="flex flex-col gap-2">
            <p className="text-lg text-ink-2">{current.translation}</p>
            {current.exampleSentence && <p className="max-w-md text-sm italic text-faint">“{current.exampleSentence}”</p>}
          </div>
        ) : (
          <Button variant="outline" onClick={() => setRevealed(true)}>
            Mostrar significado
          </Button>
        )}
      </Card>

      {revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((item) => (
            <button
              key={item.grade}
              type="button"
              onClick={() => void handleGrade(item.grade)}
              disabled={grade.isPending}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50",
                item.style,
              )}
            >
              {item.label}
              <span className="text-xs font-normal text-muted">{labels[item.grade]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
