"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import type { SpeakingSessionResult } from "@myenglishjourney/shared";
import { Card } from "../ui/Card";

export function SpeakingFeedbackResult({ result }: { result: SpeakingSessionResult }) {
  const prefersReducedMotion = useReducedMotion();

  if (result.status === "failed") {
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        No pudimos analizar tu grabación en este momento. Se guardó igual; podés intentar de nuevo.
      </div>
    );
  }

  if (!result.aiFeedback) return null;
  const feedback = result.aiFeedback;

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          Este análisis se basa en la transcripción de lo que dijiste (gramática, vocabulario y expresión) — no
          evalúa tu pronunciación real.
        </span>
      </div>

      <Card>
        <h3 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-ink">Lo que dijiste</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{feedback.transcript}</p>
        <p className="mt-2 text-sm italic text-muted">{feedback.translation}</p>
      </Card>

      {feedback.grammarErrors.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-ink">Errores gramaticales</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {feedback.grammarErrors.map((err, i) => (
              <li key={i} className="rounded-xl bg-zinc-50 p-3 dark:bg-white/[0.04]">
                <p>
                  <span className="text-zinc-500 line-through">{err.original}</span> →{" "}
                  <span className="font-medium text-zinc-900 dark:text-ink">{err.corrected}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{err.explanation}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-1.5 text-sm font-semibold text-zinc-900 dark:text-ink">Una forma más natural de decirlo</h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{feedback.moreNaturalExpression}</p>
      </Card>

      {feedback.vocabularySuggestions.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-ink">Vocabulario sugerido</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {feedback.vocabularySuggestions.map((v, i) => (
              <div key={i} className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-white/[0.04]">
                <p className="font-medium text-zinc-900 dark:text-ink">{v.word}</p>
                <p className="text-muted">{v.meaning}</p>
                <p className="mt-1 italic text-zinc-500 dark:text-zinc-400">"{v.example}"</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="border-primary/20 bg-primary/5">
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{feedback.encouragingNote}</p>
        <p className="mt-2 text-sm font-medium text-primary">{feedback.recommendation}</p>
      </Card>
    </motion.div>
  );
}
