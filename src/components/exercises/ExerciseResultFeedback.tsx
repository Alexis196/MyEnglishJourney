"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ExerciseAttemptResult } from "@myenglishjourney/shared";
import { cn } from "../../utils/cn";

export function ExerciseResultFeedback({ result }: { result: ExerciseAttemptResult }) {
  const prefersReducedMotion = useReducedMotion();

  if (result.evaluationStatus === "ai_pending") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-track p-3 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Evaluando tu respuesta con IA...
      </div>
    );
  }

  if (result.evaluationStatus === "error") {
    return (
      <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
        No pudimos evaluar tu respuesta en este momento. Tu progreso se guardó; podés reintentar más tarde.
      </div>
    );
  }

  const isCorrect = result.isCorrect ?? (result.score !== null && result.score >= 70);

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        isCorrect
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-500/10"
          : "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-500/10",
      )}
    >
      {isCorrect ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      )}
      <div className="flex-1 text-sm">
        <p className={cn("font-medium", isCorrect ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300")}>
          {isCorrect ? "¡Correcto!" : "Casi — revisá la corrección"}
        </p>

        {result.aiFeedback && (
          <div className="mt-2 flex flex-col gap-2 text-ink-2">
            <p>
              <span className="font-medium">Versión corregida:</span> {result.aiFeedback.correctedText}
            </p>
            {result.aiFeedback.grammarErrors.length > 0 && (
              <div>
                <p className="font-medium">Errores gramaticales</p>
                <ul className="list-inside list-disc">
                  {result.aiFeedback.grammarErrors.map((err, i) => (
                    <li key={i}>
                      <span className="line-through">{err.original}</span> → {err.corrected} — {err.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.aiFeedback.naturalAlternatives.length > 0 && (
              <div>
                <p className="font-medium">Alternativas más naturales</p>
                <ul className="list-inside list-disc">
                  {result.aiFeedback.naturalAlternatives.map((alt, i) => (
                    <li key={i}>
                      {alt.suggestion} — {alt.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="italic text-muted">{result.aiFeedback.recommendation}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
