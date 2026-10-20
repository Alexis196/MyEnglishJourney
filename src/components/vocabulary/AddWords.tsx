"use client";

import { useState } from "react";
import { Check, Loader2, Plus, ScanText, Sparkles } from "lucide-react";
import type { DetectedWord, DetectVocabularyResponse } from "@myenglishjourney/shared";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { useDetectWords, useEnrichWord, useSaveWord } from "../../hooks/useVocabulary";
import { useToast } from "../../context/ToastProvider";
import { cn } from "../../utils/cn";

const field =
  "w-full rounded-xl border border-line-strong bg-soft px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary";

export function AddWords() {
  return (
    <div className="flex flex-col gap-4">
      <ManualWord />
      <DetectFromText />
    </div>
  );
}

function ManualWord() {
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");
  const [category, setCategory] = useState("");
  const [filled, setFilled] = useState(false);
  const enrich = useEnrichWord();
  const save = useSaveWord();
  const { showToast } = useToast();

  const reset = () => {
    setInput("");
    setTerm("");
    setTranslation("");
    setExample("");
    setCategory("");
    setFilled(false);
    enrich.reset();
  };

  const handleComplete = async () => {
    const typed = input.trim();
    if (!typed || enrich.isPending) return;
    try {
      const result = await enrich.mutateAsync(typed);
      setTerm(result.term);
      setTranslation(result.translation);
      setExample(result.exampleSentence);
      setCategory(result.category);
      setFilled(true);
    } catch {
      // Without the AI the student can still type everything by hand.
      setTerm(typed);
      setFilled(true);
      showToast("No pudimos completar la palabra. Podés escribir la traducción vos.", "error");
    }
  };

  const handleSave = async () => {
    if (!term.trim() || !translation.trim() || save.isPending) return;
    try {
      const result = await save.mutateAsync({
        term,
        translation,
        exampleSentence: example.trim() || undefined,
        category: category.trim() || undefined,
        source: "manual",
      });
      showToast(result.created ? `"${term}" se guardó en tu vocabulario` : `"${term}" ya estaba en tu vocabulario`, "success");
      reset();
    } catch {
      showToast("No se pudo guardar la palabra. Intentá de nuevo.", "error");
    }
  };

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">Agregar una palabra</h2>
      <p className="mt-1 text-sm text-muted">Escribila en inglés o en español. La IA completa la traducción, un ejemplo y el tipo de palabra.</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleComplete();
          }}
          maxLength={80}
          placeholder="Ej: cope with, aprovechar, shift…"
          aria-label="Palabra o frase"
          className={field}
          disabled={filled}
        />
        {!filled && (
          <Button onClick={() => void handleComplete()} isLoading={enrich.isPending} disabled={!input.trim()} className="shrink-0">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Completar con IA
          </Button>
        )}
      </div>

      {filled && (
        <div className="mt-4 flex flex-col gap-2.5 rounded-xl bg-soft p-3.5">
          <Labeled label="Palabra o frase (inglés)">
            <input value={term} onChange={(event) => setTerm(event.target.value)} maxLength={80} className={field} />
          </Labeled>
          <Labeled label="Traducción">
            <input value={translation} onChange={(event) => setTranslation(event.target.value)} maxLength={200} className={field} />
          </Labeled>
          <Labeled label="Ejemplo">
            <input value={example} onChange={(event) => setExample(event.target.value)} maxLength={300} className={field} />
          </Labeled>
          <Labeled label="Tipo">
            <input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={40} className={field} />
          </Labeled>
          <div className="mt-1 flex gap-2">
            <Button onClick={() => void handleSave()} isLoading={save.isPending} disabled={!term.trim() || !translation.trim()}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Guardar en mi vocabulario
            </Button>
            <Button variant="outline" onClick={reset} disabled={save.isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function DetectFromText() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<DetectVocabularyResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const detect = useDetectWords();
  const save = useSaveWord();
  const { showToast } = useToast();

  const handleDetect = async () => {
    if (text.trim().length < 15 || detect.isPending) return;
    try {
      const response = await detect.mutateAsync(text);
      setResult(response);
      setSelected(new Set(response.words.map((word) => word.term)));
      setSaved(new Set());
    } catch {
      showToast("No pudimos analizar el texto. Intentá de nuevo.", "error");
    }
  };

  const toggle = (term: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  const pending = (result?.words ?? []).filter((word) => selected.has(word.term) && !saved.has(word.term));

  const handleSaveSelected = async () => {
    if (pending.length === 0 || save.isPending) return;
    let ok = 0;
    for (const word of pending) {
      try {
        await save.mutateAsync({
          term: word.term,
          translation: word.translation,
          exampleSentence: word.exampleSentence || undefined,
          category: word.category || undefined,
          source: "text",
        });
        ok += 1;
        setSaved((prev) => new Set(prev).add(word.term));
      } catch {
        // keep going: the others can still be saved
      }
    }
    if (ok === pending.length) showToast(ok === 1 ? "1 palabra guardada" : `${ok} palabras guardadas`, "success");
    else showToast(`Se guardaron ${ok} de ${pending.length}. Probá con las que faltan.`, "error");
  };

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">Detectar palabras nuevas en un texto</h2>
      <p className="mt-1 text-sm text-muted">
        Pegá algo en inglés (un artículo, un mensaje, una letra de canción). La IA marca las palabras que probablemente sean nuevas para tu nivel.
      </p>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={2000}
        rows={5}
        placeholder="Pegá acá tu texto en inglés…"
        aria-label="Texto en inglés"
        className={cn(field, "mt-3 resize-y")}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-faint">{text.length}/2000</span>
        <Button onClick={() => void handleDetect()} isLoading={detect.isPending} disabled={text.trim().length < 15}>
          <ScanText className="h-4 w-4" aria-hidden="true" /> Detectar palabras
        </Button>
      </div>

      {result && (
        <div className="mt-4">
          {result.words.length === 0 ? (
            <p className="rounded-xl bg-soft p-3 text-sm text-muted">
              {result.alreadySaved > 0
                ? `Todas las palabras nuevas de este texto ya están en tu vocabulario (${result.alreadySaved}).`
                : "No encontramos palabras nuevas para tu nivel en este texto. ¡Lo entendés bien!"}
            </p>
          ) : (
            <>
              <p className="mb-2 text-sm text-ink-2">
                Encontramos {result.words.length} {result.words.length === 1 ? "palabra" : "palabras"} para aprender
                {result.alreadySaved > 0 ? ` (otras ${result.alreadySaved} ya las tenías)` : ""}. Elegí cuáles guardar:
              </p>
              <ul className="flex flex-col gap-2">
                {result.words.map((word) => (
                  <DetectedRow
                    key={word.term}
                    word={word}
                    checked={selected.has(word.term)}
                    saved={saved.has(word.term)}
                    onToggle={() => toggle(word.term)}
                  />
                ))}
              </ul>
              <Button onClick={() => void handleSaveSelected()} isLoading={save.isPending} disabled={pending.length === 0} className="mt-3">
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {pending.length === 0 ? "Todo guardado" : `Guardar ${pending.length} ${pending.length === 1 ? "palabra" : "palabras"}`}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function DetectedRow({ word, checked, saved, onToggle }: { word: DetectedWord; checked: boolean; saved: boolean; onToggle: () => void }) {
  return (
    <li className={cn("rounded-xl border p-3", saved ? "border-primary/30 bg-primary/5" : "border-line bg-card")}>
      <label className="flex cursor-pointer items-start gap-3">
        {saved ? (
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-label="Guardada" />
        ) : (
          <input type="checkbox" checked={checked} onChange={onToggle} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
        )}
        <span className="min-w-0">
          <span className="block text-sm">
            <span className="font-semibold text-ink">{word.term}</span>
            <span className="text-ink-2"> · {word.translation}</span>
            {word.category && <span className="text-xs text-faint"> · {word.category}</span>}
          </span>
          {word.exampleSentence && <span className="mt-0.5 block text-sm italic text-faint">“{word.exampleSentence}”</span>}
        </span>
      </label>
    </li>
  );
}
