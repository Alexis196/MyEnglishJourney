"use client";

import { useMemo, useState } from "react";
import { BookMarked, Pencil, Search, Trash2 } from "lucide-react";
import type { LearningStatus, SavedWord } from "@myenglishjourney/shared";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { useDeleteWord, useUpdateWord } from "../../hooks/useVocabulary";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";
import { SpeakButton } from "./SpeakButton";

type Filter = "all" | "due" | LearningStatus;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "due", label: "Para repasar" },
  { id: "difficult", label: "Difíciles" },
  { id: "pending", label: "En proceso" },
  { id: "learned", label: "Aprendidas" },
];

const STATUS_BADGE: Record<LearningStatus, { label: string; tone: "neutral" | "success" | "warning" }> = {
  pending: { label: "En proceso", tone: "neutral" },
  learned: { label: "Aprendida", tone: "success" },
  difficult: { label: "Difícil", tone: "warning" },
};

const SOURCE_LABEL: Record<SavedWord["source"], string> = {
  manual: "Agregada a mano",
  text: "De un texto",
  lesson: "De una lección",
  live: "De la conversación",
  speaking: "De speaking",
};

function matches(word: SavedWord, filter: Filter, query: string): boolean {
  if (filter === "due" ? !word.review.due : filter !== "all" && word.learningStatus !== filter) return false;
  const needle = query.trim().toLowerCase();
  return !needle || word.term.toLowerCase().includes(needle) || word.translation.toLowerCase().includes(needle);
}

export function WordList({ words, onAdd }: { words: SavedWord[]; onAdd: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Kept while the dialog animates out, so the word's name does not vanish mid-transition.
  const [toDelete, setToDelete] = useState<SavedWord | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteWord = useDeleteWord();
  const { showToast } = useToast();

  const visible = useMemo(() => words.filter((word) => matches(word, filter, query)), [words, filter, query]);

  const handleDelete = async () => {
    if (!toDelete || deleteWord.isPending) return;
    try {
      await deleteWord.mutateAsync(toDelete.id);
      showToast("Palabra eliminada", "success");
    } catch {
      showToast("No se pudo eliminar la palabra.", "error");
    } finally {
      setDeleteOpen(false);
    }
  };

  if (words.length === 0) {
    return (
      <EmptyState
        icon={BookMarked}
        title="Todavía no guardaste palabras"
        description="Agregalas a mano, detectalas en un texto o guardalas desde tus lecciones y conversaciones con el botón +."
        action={<Button onClick={onAdd}>Agregar palabras</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en inglés o en español"
          aria-label="Buscar palabras"
          className="w-full rounded-xl border border-line-strong bg-soft py-2.5 pl-9 pr-3.5 text-sm text-ink placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar palabras">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              filter === item.id ? "border-primary/60 bg-primary/10 font-medium text-ink" : "border-line bg-card text-ink-2 hover:bg-hover",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl bg-soft p-4 text-sm text-muted">No hay palabras que coincidan con esa búsqueda.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((word) => (
            <li key={word.id} className="rounded-2xl border border-line bg-card p-4 shadow-card">
              {editingId === word.id ? (
                <EditForm word={word} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1 text-base font-semibold text-ink">
                        <span className="break-words">{word.term}</span>
                        <SpeakButton text={word.term} />
                      </p>
                      <p className="text-sm text-ink-2">{word.translation}</p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => setEditingId(word.id)}
                        aria-label={`Editar ${word.term}`}
                        title="Editar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setToDelete(word);
                          setDeleteOpen(true);
                        }}
                        aria-label={`Eliminar ${word.term}`}
                        title="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {word.exampleSentence && <p className="mt-2 text-sm italic text-faint">“{word.exampleSentence}”</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_BADGE[word.learningStatus].tone}>{STATUS_BADGE[word.learningStatus].label}</Badge>
                    {word.review.due && <Badge tone="brand">Para repasar</Badge>}
                    {word.category && <Badge>{word.category}</Badge>}
                    <span className="text-xs text-faint">{SOURCE_LABEL[word.source]}</span>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteOpen}
        icon={Trash2}
        title="¿Eliminar esta palabra?"
        description={
          <>
            <strong className="font-semibold text-ink">{toDelete?.term}</strong> se borra de tu vocabulario junto con su progreso de repaso.
          </>
        }
        confirmLabel="Eliminar"
        isLoading={deleteWord.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function EditForm({ word, onDone }: { word: SavedWord; onDone: () => void }) {
  const [translation, setTranslation] = useState(word.translation);
  const [example, setExample] = useState(word.exampleSentence ?? "");
  const update = useUpdateWord();
  const { showToast } = useToast();

  const handleSave = async () => {
    if (!translation.trim() || update.isPending) return;
    try {
      await update.mutateAsync({ id: word.id, translation, exampleSentence: example.trim() || null });
      onDone();
    } catch {
      showToast("No se pudo guardar el cambio.", "error");
    }
  };

  const field =
    "w-full rounded-lg border border-line-strong bg-soft px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold text-ink">{word.term}</p>
      <label className="text-xs font-medium text-muted" htmlFor={`tr-${word.id}`}>
        Traducción
      </label>
      <input id={`tr-${word.id}`} value={translation} onChange={(event) => setTranslation(event.target.value)} maxLength={200} className={field} />
      <label className="text-xs font-medium text-muted" htmlFor={`ex-${word.id}`}>
        Ejemplo
      </label>
      <input id={`ex-${word.id}`} value={example} onChange={(event) => setExample(event.target.value)} maxLength={300} className={field} />
      <div className="mt-1 flex gap-2">
        <Button size="sm" onClick={() => void handleSave()} isLoading={update.isPending} disabled={!translation.trim()}>
          Guardar
        </Button>
        <Button size="sm" variant="outline" onClick={onDone} disabled={update.isPending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
