"use client";

import { useState } from "react";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AddWords } from "../../components/vocabulary/AddWords";
import { Flashcards } from "../../components/vocabulary/Flashcards";
import { WordList } from "../../components/vocabulary/WordList";
import { useVocabularyList } from "../../hooks/useVocabulary";
import { cn } from "../../utils/cn";

type Tab = "words" | "add" | "review";

export function VocabularyPage() {
  const [tab, setTab] = useState<Tab>("words");
  const { data, isLoading, isError, refetch } = useVocabularyList();

  const due = data?.stats.due ?? 0;
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "words", label: "Mis palabras" },
    { id: "add", label: "Agregar" },
    { id: "review", label: due > 0 ? `Repasar (${due})` : "Repasar" },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Vocabulario</h1>
        <p className="text-sm text-muted">Guardá las palabras que querés aprender y repasalas cuando te toca, justo antes de olvidarlas.</p>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Guardadas" value={data.stats.total} />
          <Stat label="Para repasar" value={data.stats.due} highlight={data.stats.due > 0} />
          <Stat label="Difíciles" value={data.stats.difficult} />
          <Stat label="Aprendidas" value={data.stats.learned} />
        </div>
      )}

      <div role="tablist" aria-label="Vocabulario" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-soft p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              tab === item.id ? "bg-card text-ink shadow-card" : "text-muted hover:text-ink-2",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "add" && <AddWords />}
      {tab === "review" && <Flashcards onGoAdd={() => setTab("add")} />}
      {tab === "words" &&
        (isLoading ? (
          <CardSkeleton />
        ) : isError || !data ? (
          <Card>
            <p className="text-sm text-muted">No pudimos cargar tu vocabulario.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="mt-3">
              Reintentar
            </Button>
          </Card>
        ) : (
          <WordList words={data.items} onAdd={() => setTab("add")} />
        ))}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-3.5 shadow-card", highlight ? "border-primary/40" : "border-line")}>
      <p className={cn("text-2xl font-semibold", highlight ? "text-primary" : "text-ink")}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
