"use client";

import { Check, Loader2, Plus } from "lucide-react";
import type { VocabularySource } from "@myenglishjourney/shared";
import { useSaveWord, useVocabularyList } from "../../hooks/useVocabulary";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";

interface SaveWordButtonProps {
  term: string;
  translation: string;
  exampleSentence?: string | undefined;
  source: VocabularySource;
  sourceLessonId?: string | undefined;
  className?: string;
}

/** One tap to add a word or phrase to the student's vocabulary, wherever it shows up. */
export function SaveWordButton({ term, translation, exampleSentence, source, sourceLessonId, className }: SaveWordButtonProps) {
  const { data } = useVocabularyList();
  const save = useSaveWord();
  const { showToast } = useToast();

  const alreadySaved = data?.items.some((item) => item.term.trim().toLowerCase() === term.trim().toLowerCase()) ?? false;
  const saved = alreadySaved || save.isSuccess;

  const handleSave = async () => {
    if (saved || save.isPending) return;
    try {
      const result = await save.mutateAsync({ term, translation, exampleSentence, source, sourceLessonId });
      showToast(result.created ? `"${term}" se guardó en tu vocabulario` : `"${term}" ya estaba en tu vocabulario`, "success");
    } catch {
      showToast("No se pudo guardar la palabra. Intentá de nuevo.", "error");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSave()}
      disabled={saved || save.isPending}
      aria-label={saved ? `${term} ya está en tu vocabulario` : `Guardar ${term} en tu vocabulario`}
      title={saved ? "Ya está en tu vocabulario" : "Guardar en vocabulario"}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        saved ? "bg-primary/15 text-primary" : "text-muted hover:bg-primary/10 hover:text-primary",
        className,
      )}
    >
      {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
    </button>
  );
}
