"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Languages, Loader2, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import {
  CEFR_LEVELS,
  LIVE_PACES,
  LIVE_PLAYBACK_RATES,
  LIVE_SCENARIOS,
  LIVE_VOICES,
  type CefrLevel,
  type EndLiveSpeakingResponse,
  type LiveTurnTranslation,
} from "@myenglishjourney/shared";
import { useLiveConversation, type DisplayTurn } from "../../hooks/useLiveConversation";
import { useLivePreferences } from "../../hooks/useLivePreferences";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

interface LiveConversationProps {
  level: CefrLevel | null;
}

const MODE_FREE = "free";

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function LiveConversation({ level }: LiveConversationProps) {
  const { state, start, end, toggleMute, setPlaybackRate, translate, reset } = useLiveConversation();
  const [choice, setChoice] = useState<string>(MODE_FREE);
  const { preferences, update } = useLivePreferences();

  const rank = level ? CEFR_LEVELS.indexOf(level) : 0;
  const scenarios = useMemo(() => LIVE_SCENARIOS.filter((scenario) => CEFR_LEVELS.indexOf(scenario.from) <= rank + 1), [rank]);

  const handleStart = () => {
    const settings = { correctWhileTalking: preferences.correctWhileTalking, voice: preferences.voice, pace: preferences.pace };
    void start(choice === MODE_FREE ? { mode: "free", ...settings } : { mode: "scenario", scenarioId: choice, ...settings });
  };

  if (state.phase === "idle" || state.phase === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <h2 className="text-base font-semibold text-ink">Conversación en vivo</h2>
          <p className="mt-1 text-sm text-muted">
            Hablá con tu tutor de inglés en tiempo real, como en una llamada. Se adapta a tu nivel
            {level ? ` (${level})` : ""} y dura hasta 5 minutos.
          </p>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-ink">¿De qué querés hablar?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                selected={choice === MODE_FREE}
                onSelect={() => setChoice(MODE_FREE)}
                title="Conversación libre"
                description="Charlá de lo que quieras; el tutor elige temas según tu perfil."
              />
              {scenarios.map((scenario) => (
                <ChoiceCard
                  key={scenario.id}
                  selected={choice === scenario.id}
                  onSelect={() => setChoice(scenario.id)}
                  title={scenario.title}
                  description={scenario.description}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-ink">Voz del tutor</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LIVE_VOICES.map((voice) => (
                <Chip key={voice.id} selected={preferences.voice === voice.id} onSelect={() => update({ voice: voice.id })}>
                  {voice.id} <span className="text-muted">· {voice.trait}</span>
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-ink">Velocidad al hablar</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LIVE_PACES.map((pace) => (
                <Chip key={pace.id} selected={preferences.pace === pace.id} onSelect={() => update({ pace: pace.id })}>
                  {pace.label}
                </Chip>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Si te habla muy rápido, elegí “Muy lento”: además de pedirle que hable pausado, reproduce el audio más lento (la voz se
              escucha un poco más grave). Podés cambiarlo durante la charla.
            </p>
          </fieldset>

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={preferences.correctWhileTalking}
              onChange={(event) => update({ correctWhileTalking: event.target.checked })}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              Que me corrija mientras hablamos
              <span className="block text-xs text-muted">Si lo dejás apagado, las correcciones llegan al final.</span>
            </span>
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={handleStart}>
              <Radio className="h-4 w-4" aria-hidden="true" /> Empezar a hablar
            </Button>
            <span className="text-xs text-muted">Te va a pedir permiso para usar el micrófono. Usá auriculares para evitar el eco.</span>
          </div>
        </Card>

        {state.phase === "error" && state.error && (
          <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            {state.error}
          </div>
        )}
      </div>
    );
  }

  if (state.phase === "done" && state.result) {
    return <LiveResult result={state.result} turnsCount={state.turns.length} onAgain={reset} />;
  }

  const connecting = state.phase === "connecting";
  const ending = state.phase === "ending";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{state.scenarioTitle ?? "Conversación libre"}</p>
          <p className="text-xs text-muted" aria-live="polite">
            {connecting ? "Conectando…" : ending ? "Preparando tus correcciones…" : "En vivo · hablá cuando quieras"}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium tabular-nums",
            state.secondsLeft <= 30 && state.phase === "live" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-soft text-ink-2",
          )}
          aria-label="Tiempo restante"
        >
          {state.phase === "live" ? formatClock(state.secondsLeft) : "—"}
        </div>
      </div>

      <Transcript turns={state.turns} onTranslate={state.phase === "live" ? translate : undefined} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Velocidad del audio">
        <span className="text-xs text-muted">Velocidad del audio</span>
        {LIVE_PLAYBACK_RATES.map((rate) => (
          <Chip key={rate} selected={state.playbackRate === rate} onSelect={() => setPlaybackRate(rate)}>
            {rate === 1 ? "Normal" : `${rate}×`}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={toggleMute} disabled={state.phase !== "live"} aria-pressed={state.muted}>
          {state.muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
          {state.muted ? "Activar micrófono" : "Silenciar"}
        </Button>
        <Button onClick={() => void end()} isLoading={ending} disabled={connecting} className="bg-red-600 hover:bg-red-600/90">
          <PhoneOff className="h-4 w-4" aria-hidden="true" /> Terminar
        </Button>
      </div>
    </Card>
  );
}

function Chip(props: { selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        props.selected ? "border-primary/60 bg-primary/10 font-medium text-ink" : "border-line bg-card text-ink-2 hover:bg-hover",
      )}
    >
      {props.children}
    </button>
  );
}

function ChoiceCard(props: { selected: boolean; onSelect: () => void; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      aria-pressed={props.selected}
      className={cn(
        "rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        props.selected ? "border-primary/60 bg-primary/10" : "border-line bg-card hover:bg-hover",
      )}
    >
      <span className="block text-sm font-medium text-ink">{props.title}</span>
      <span className="mt-0.5 block text-xs text-muted">{props.description}</span>
    </button>
  );
}

type TranslationState = { status: "loading" } | { status: "error" } | { status: "ready"; data: LiveTurnTranslation };

function Transcript({ turns, onTranslate }: { turns: DisplayTurn[]; onTranslate?: ((text: string) => Promise<LiveTurnTranslation>) | undefined }) {
  const endRef = useRef<HTMLDivElement>(null);
  // Translations are kept by sentence, so asking again for the same one is free and instant.
  const [translations, setTranslations] = useState<Record<string, TranslationState>>({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, translations]);

  const requestTranslation = async (text: string) => {
    if (!onTranslate || translations[text]?.status === "loading" || translations[text]?.status === "ready") return;
    setTranslations((prev) => ({ ...prev, [text]: { status: "loading" } }));
    try {
      const data = await onTranslate(text);
      setTranslations((prev) => ({ ...prev, [text]: { status: "ready", data } }));
    } catch {
      setTranslations((prev) => ({ ...prev, [text]: { status: "error" } }));
    }
  };

  return (
    <div className="flex max-h-72 min-h-40 flex-col gap-2 overflow-y-auto rounded-xl bg-soft p-3" aria-label="Transcripción">
      {turns.length === 0 && <p className="text-sm text-faint">Tu tutor está por saludarte…</p>}
      {turns.map((turn, index) => {
        const isTutor = turn.role === "tutor";
        const translation = translations[turn.text];
        return (
          <div key={index} className={cn("flex flex-col gap-1", isTutor ? "items-start" : "items-end")}>
            <p
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                isTutor ? "bg-card text-ink-2 shadow-card" : "bg-primary/15 text-ink",
              )}
            >
              {turn.text}
            </p>

            {isTutor && !turn.partial && onTranslate && (!translation || translation.status === "error") && (
              <button
                type="button"
                onClick={() => void requestTranslation(turn.text)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                {translation?.status === "error" ? "No se pudo traducir. Reintentar" : "Traducir"}
              </button>
            )}
            {translation?.status === "loading" && (
              <span className="inline-flex items-center gap-1 px-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Traduciendo…
              </span>
            )}
            {translation?.status === "ready" && (
              <div className="max-w-[85%] rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-ink-2">
                <p>{translation.data.translation}</p>
                {translation.data.keyWords.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {translation.data.keyWords.map((item) => (
                      <li key={item.word} className="rounded-md bg-card px-2 py-0.5 text-xs">
                        <span className="font-medium text-ink">{item.word}</span>
                        <span className="text-muted"> = {item.meaning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

function LiveResult({ result, turnsCount, onAgain }: { result: EndLiveSpeakingResponse; turnsCount: number; onAgain: () => void }) {
  const feedback = result.feedback;
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h2 className="text-base font-semibold text-ink">¡Buena práctica!</h2>
        <p className="mt-1 text-sm text-muted">
          Hablaste {formatClock(result.durationSeconds)} minutos.
          {!feedback && turnsCount < 2 && " Hablaste muy poco como para analizar; probá de nuevo con más calma."}
          {!feedback && turnsCount >= 2 && " No pudimos generar las correcciones esta vez, pero tu conversación quedó guardada."}
        </p>
      </Card>

      {feedback && (
        <>
          <div className="flex items-start gap-2 rounded-xl bg-primary/5 p-3 text-xs text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span>El análisis se basa en la transcripción de lo que dijiste (gramática, vocabulario y expresión); no evalúa tu pronunciación real.</span>
          </div>

          <Card>
            <h3 className="mb-1.5 text-sm font-semibold text-ink">Resumen</h3>
            <p className="text-sm text-ink-2">{feedback.summary}</p>
            <p className="mt-2 text-sm text-ink-2">
              <span className="font-medium text-ink">Lo que hiciste bien: </span>
              {feedback.strengths}
            </p>
          </Card>

          {feedback.corrections.length > 0 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-ink">Correcciones</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {feedback.corrections.map((item, index) => (
                  <li key={index} className="rounded-xl bg-tint p-3">
                    <p>
                      <span className="text-faint line-through">{item.original}</span> →{" "}
                      <span className="font-medium text-ink">{item.corrected}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted">{item.explanation}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {feedback.usefulPhrases.length > 0 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-ink">Frases útiles</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {feedback.usefulPhrases.map((item, index) => (
                  <li key={index}>
                    <span className="font-medium text-ink">{item.phrase}</span>
                    <span className="text-muted"> — {item.meaning}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h3 className="mb-1.5 text-sm font-semibold text-ink">Para la próxima</h3>
            <p className="text-sm text-ink-2">{feedback.nextStep}</p>
          </Card>
        </>
      )}

      <Button variant="outline" onClick={onAgain} className="w-fit">
        Practicar de nuevo
      </Button>
    </div>
  );
}
