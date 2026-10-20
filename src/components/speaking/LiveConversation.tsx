"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, Mic, MicOff, PhoneOff, Radio } from "lucide-react";
import { CEFR_LEVELS, LIVE_SCENARIOS, type CefrLevel, type EndLiveSpeakingResponse } from "@myenglishjourney/shared";
import { useLiveConversation } from "../../hooks/useLiveConversation";
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
  const { state, start, end, toggleMute, reset } = useLiveConversation();
  const [choice, setChoice] = useState<string>(MODE_FREE);
  const [correctWhileTalking, setCorrectWhileTalking] = useState(false);

  const rank = level ? CEFR_LEVELS.indexOf(level) : 0;
  const scenarios = useMemo(() => LIVE_SCENARIOS.filter((scenario) => CEFR_LEVELS.indexOf(scenario.from) <= rank + 1), [rank]);

  const handleStart = () => {
    void start(
      choice === MODE_FREE
        ? { mode: "free", correctWhileTalking }
        : { mode: "scenario", scenarioId: choice, correctWhileTalking },
    );
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

          <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={correctWhileTalking}
              onChange={(event) => setCorrectWhileTalking(event.target.checked)}
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

      <Transcript turns={state.turns} />

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

function Transcript({ turns }: { turns: Array<{ role: "user" | "tutor"; text: string }> }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns]);

  return (
    <div className="flex max-h-72 min-h-40 flex-col gap-2 overflow-y-auto rounded-xl bg-soft p-3" aria-label="Transcripción">
      {turns.length === 0 && <p className="text-sm text-faint">Tu tutor está por saludarte…</p>}
      {turns.map((turn, index) => (
        <div key={index} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
          <p
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              turn.role === "user" ? "bg-primary/15 text-ink" : "bg-card text-ink-2 shadow-card",
            )}
          >
            {turn.text}
          </p>
        </div>
      ))}
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
