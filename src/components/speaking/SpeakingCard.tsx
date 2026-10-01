"use client";

import type { ReactNode } from "react";
import { Languages, Shuffle } from "lucide-react";
import { ArtworkCard } from "../ui/ArtworkCard";
import { Button } from "../ui/Button";

interface SpeakingCardProps {
  question: string;
  /** Spanish version, revealed on demand. Looking at it is never penalized. */
  translation?: string;
  showTranslation?: boolean;
  onToggleTranslation?: () => void;
  onNewQuestion: () => void;
  newQuestionDisabled?: boolean;
  /** Recorder and submit controls. */
  children: ReactNode;
}

/** Main Speaking Lab card: question on the left, controls below it, 3D microphone on the right. */
export function SpeakingCard({ question, translation, showTranslation, onToggleTranslation, onNewQuestion, newQuestionDisabled, children }: SpeakingCardProps) {
  return (
    <ArtworkCard
      art="speaking"
      artPositionClassName="bg-[position:78%_65%] @xl:bg-right"
      contentClassName="@xl:max-w-[58%] @xl:py-8"
      scrim="strong"
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-link">Pregunta actual</p>
          <p className="mt-2 text-xl font-semibold leading-snug text-ink @xl:text-2xl">{question}</p>
          {translation && onToggleTranslation && (
            <div className="mt-3 flex flex-col items-start gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleTranslation}
                aria-pressed={showTranslation}
                className="w-fit"
              >
                <Languages className="h-4 w-4" /> {showTranslation ? "Ocultar traducción" : "Traducir"}
              </Button>
              {showTranslation && (
                <p lang="es" className="text-base leading-snug text-ink-2 @xl:text-lg">
                  {translation}
                </p>
              )}
            </div>
          )}
        </div>

        {children}

        <Button variant="ghost" size="sm" onClick={onNewQuestion} disabled={newQuestionDisabled} className="w-fit">
          <Shuffle className="h-4 w-4" /> Otra pregunta
        </Button>
      </div>
    </ArtworkCard>
  );
}
