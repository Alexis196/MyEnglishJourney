"use client";

import type { ReactNode } from "react";
import { Shuffle } from "lucide-react";
import { ArtworkCard } from "../ui/ArtworkCard";
import { Button } from "../ui/Button";

interface SpeakingCardProps {
  question: string;
  onNewQuestion: () => void;
  newQuestionDisabled?: boolean;
  /** Recorder and submit controls. */
  children: ReactNode;
}

/** Main Speaking Lab card: question on the left, controls below it, 3D microphone on the right. */
export function SpeakingCard({ question, onNewQuestion, newQuestionDisabled, children }: SpeakingCardProps) {
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
        </div>

        {children}

        <Button variant="ghost" size="sm" onClick={onNewQuestion} disabled={newQuestionDisabled} className="w-fit">
          <Shuffle className="h-4 w-4" /> Otra pregunta
        </Button>
      </div>
    </ArtworkCard>
  );
}
