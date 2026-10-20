"use client";

import { Volume2 } from "lucide-react";
import { canSpeak, speakEnglish } from "../../lib/speech";
import { cn } from "../../utils/cn";

/** Plays how a word sounds, using the browser's own voice. Hidden when the browser cannot speak. */
export function SpeakButton({ text, className }: { text: string; className?: string }) {
  // Evaluated on every render on purpose: it is false during server rendering and true in a capable browser.
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      onClick={() => speakEnglish(text)}
      aria-label={`Escuchar ${text}`}
      title="Escuchar"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      <Volume2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
