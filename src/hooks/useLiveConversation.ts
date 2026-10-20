"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import type {
  EndLiveSpeakingInput,
  EndLiveSpeakingResponse,
  LiveTurn,
  StartLiveSpeakingInput,
  StartLiveSpeakingResponse,
} from "@myenglishjourney/shared";
import { apiClient, ApiError } from "../lib/apiClient";
import { createAudioPlayer, startMicCapture, type AudioPlayer, type MicCapture } from "../lib/liveAudio";

export type LivePhase = "idle" | "connecting" | "live" | "ending" | "done" | "error";

export interface LiveConversationState {
  phase: LivePhase;
  /** Finished turns plus the one being spoken right now. */
  turns: LiveTurn[];
  secondsLeft: number;
  scenarioTitle: string | null;
  muted: boolean;
  result: EndLiveSpeakingResponse | null;
  error: string | null;
}

const INITIAL: LiveConversationState = {
  phase: "idle",
  turns: [],
  secondsLeft: 0,
  scenarioTitle: null,
  muted: false,
  result: null,
  error: null,
};

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "No pudimos acceder al micrófono. Permitilo en el navegador e intentá de nuevo.";
  }
  if (error instanceof DOMException && error.name === "NotFoundError") {
    return "No encontramos un micrófono conectado.";
  }
  return "No se pudo iniciar la conversación. Intentá de nuevo.";
}

/**
 * Real-time spoken conversation with the tutor. The browser talks to the Gemini Live API directly with a one-use
 * token issued by our server; our server only authorises the session and, at the end, stores the transcript and builds
 * the feedback.
 */
export function useLiveConversation() {
  const [state, setState] = useState<LiveConversationState>(INITIAL);

  const sessionRef = useRef<Session | null>(null);
  const micRef = useRef<MicCapture | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnsRef = useRef<LiveTurn[]>([]);
  const currentRef = useRef<LiveTurn | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const endingRef = useRef(false);

  const publishTurns = useCallback(() => {
    const live = currentRef.current;
    setState((prev) => ({ ...prev, turns: live ? [...turnsRef.current, { ...live }] : [...turnsRef.current] }));
  }, []);

  const flushCurrent = useCallback(() => {
    const current = currentRef.current;
    if (current && current.text.trim()) turnsRef.current.push({ role: current.role, text: current.text.trim() });
    currentRef.current = null;
  }, []);

  const appendText = useCallback(
    (role: LiveTurn["role"], text: string) => {
      if (currentRef.current && currentRef.current.role !== role) flushCurrent();
      if (!currentRef.current) currentRef.current = { role, text: "" };
      currentRef.current.text += text;
      publishTurns();
    },
    [flushCurrent, publishTurns],
  );

  const releaseResources = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    micRef.current?.stop();
    micRef.current = null;
    try {
      sessionRef.current?.close();
    } catch {
      // already closed
    }
    sessionRef.current = null;
    const player = playerRef.current;
    playerRef.current = null;
    // Let the last words finish before tearing the audio context down.
    if (player) setTimeout(() => player.close(), 1500);
  }, []);

  const end = useCallback(async () => {
    if (endingRef.current || !sessionIdRef.current) return;
    endingRef.current = true;
    flushCurrent();
    const sessionId = sessionIdRef.current;
    const durationSeconds = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    setState((prev) => ({ ...prev, phase: "ending", turns: [...turnsRef.current] }));
    releaseResources();
    try {
      const body: EndLiveSpeakingInput = { durationSeconds, turns: turnsRef.current.slice(-300) };
      const result = await apiClient.post<EndLiveSpeakingResponse>(`/api/speaking/live/${sessionId}/end`, body);
      setState((prev) => ({ ...prev, phase: "done", result }));
    } catch (error) {
      setState((prev) => ({ ...prev, phase: "error", error: friendlyError(error) }));
    }
  }, [flushCurrent, releaseResources]);

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent;
      if (!content) return;
      if (content.interrupted) playerRef.current?.interrupt();
      if (content.inputTranscription?.text) appendText("user", content.inputTranscription.text);
      if (content.outputTranscription?.text) appendText("tutor", content.outputTranscription.text);
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data) playerRef.current?.enqueue(part.inlineData.data);
      }
      if (content.turnComplete) {
        flushCurrent();
        publishTurns();
      }
    },
    [appendText, flushCurrent, publishTurns],
  );

  const start = useCallback(
    async (input: StartLiveSpeakingInput) => {
      if (state.phase === "connecting" || state.phase === "live") return;
      endingRef.current = false;
      turnsRef.current = [];
      currentRef.current = null;
      setState({ ...INITIAL, phase: "connecting" });

      let session: Session | null = null;
      try {
        // Ask for the microphone first: a refusal must not open (and bill) a conversation.
        const mic = await startMicCapture((chunk) => {
          session?.sendRealtimeInput({ audio: { data: chunk, mimeType: "audio/pcm;rate=16000" } });
        });
        micRef.current = mic;

        const started = await apiClient.post<StartLiveSpeakingResponse>("/api/speaking/live/start", input);
        sessionIdRef.current = started.sessionId;
        playerRef.current = createAudioPlayer();

        const ai = new GoogleGenAI({ apiKey: started.token, httpOptions: { apiVersion: "v1alpha" } });
        session = await ai.live.connect({
          model: started.model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: started.systemInstruction,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: started.voice } } },
            realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: 800 } },
          },
          callbacks: {
            onmessage: handleMessage,
            onerror: () => {
              void end();
            },
            onclose: () => {
              // The connection dropped (or the time cap closed it): settle the conversation with what we have.
              void end();
            },
          },
        });
        sessionRef.current = session;

        // The tutor speaks first, as the instruction says; this nudge only starts its turn.
        session.sendRealtimeInput({ text: "Hello! Let's start." });

        startedAtRef.current = Date.now();
        setState((prev) => ({
          ...prev,
          phase: "live",
          secondsLeft: started.maxSeconds,
          scenarioTitle: started.scenarioTitle,
        }));
        timerRef.current = setInterval(() => {
          const left = Math.max(0, started.maxSeconds - Math.round((Date.now() - startedAtRef.current) / 1000));
          setState((prev) => ({ ...prev, secondsLeft: left }));
          if (left <= 0) void end();
        }, 500);
      } catch (error) {
        releaseResources();
        // If the server already opened the session, close it so it does not stay "active".
        if (sessionIdRef.current && !endingRef.current) {
          endingRef.current = false;
          const abandoned = sessionIdRef.current;
          void apiClient
            .post(`/api/speaking/live/${abandoned}/end`, { durationSeconds: 0, turns: [] })
            .catch(() => undefined);
        }
        sessionIdRef.current = null;
        setState({ ...INITIAL, phase: "error", error: friendlyError(error) });
      }
    },
    [end, handleMessage, releaseResources, state.phase],
  );

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const muted = !prev.muted;
      micRef.current?.setMuted(muted);
      return { ...prev, muted };
    });
  }, []);

  const reset = useCallback(() => {
    sessionIdRef.current = null;
    setState(INITIAL);
  }, []);

  // Leaving the page mid-conversation closes the connection; the server settles the session as abandoned later.
  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, [releaseResources]);

  return { state, start, end, toggleMute, reset };
}
