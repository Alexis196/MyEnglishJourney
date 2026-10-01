"use client";

import { useRef, useState } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { pickSupportedAudioMimeType, baseMimeType } from "../../utils/audio";

export interface Recording {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
  url: string;
}

interface AudioRecorderProps {
  onRecordingReady: (recording: Recording) => void;
  disabled?: boolean;
}

type RecorderState = "idle" | "requesting" | "recording" | "recorded" | "error";

const MAX_DURATION_SECONDS = 180;

export function AudioRecorder({ onRecordingReady, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopTimer();
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const url = URL.createObjectURL(blob);
        const result: Recording = { blob, mimeType: baseMimeType(mimeType), durationSeconds, url };
        setRecording(result);
        setState("recorded");
        onRecordingReady(result);
      };

      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
      setElapsedSeconds(0);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= MAX_DURATION_SECONDS) {
            mediaRecorderRef.current?.stop();
          }
          return next;
        });
      }, 1000);
    } catch {
      setState("error");
      setErrorMessage("No pudimos acceder al micrófono. Revisá los permisos del navegador e intentá de nuevo.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const reset = () => {
    if (recording) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setState("idle");
    setElapsedSeconds(0);
  };

  const formatTimer = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  if (state === "recorded" && recording) {
    return (
      <div className="flex flex-col gap-3">
        <audio controls src={recording.url} className="h-10 w-full max-w-md" />
        <Button variant="outline" onClick={reset} disabled={disabled} className="w-fit">
          <RotateCcw className="h-4 w-4" /> Grabar de nuevo
        </Button>
      </div>
    );
  }

  const isRecording = state === "recording";

  return (
    <div className="flex flex-col gap-3">
      {/* Reserved waveform + timer zone: it keeps its height so the card does not jump when recording starts. */}
      <div className="flex min-h-12 items-center gap-3" aria-live="polite">
        <WaveformBars active={isRecording} />
        {isRecording && (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-red-300">
            <span className="sr-only">Grabando: </span>
            {formatTimer(elapsedSeconds)}
          </span>
        )}
      </div>

      {isRecording ? (
        <Button variant="outline" onClick={stopRecording} className="w-fit">
          <Square className="h-4 w-4" /> Detener
        </Button>
      ) : (
        <Button onClick={startRecording} isLoading={state === "requesting"} disabled={disabled} className="w-fit">
          <Mic className="h-4 w-4" aria-hidden="true" /> Empezar a grabar
        </Button>
      )}

      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

const WAVE_HEIGHTS = [30, 55, 40, 75, 50, 90, 60, 35, 80, 45, 70, 55, 95, 40, 65, 30, 75, 50, 85, 45, 60, 35, 70, 40];

/** Purely decorative bars: calm when idle, animated while recording. */
function WaveformBars({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className="flex h-10 flex-1 items-center gap-[3px]">
      {WAVE_HEIGHTS.map((height, index) => (
        <span
          key={index}
          style={{ height: `${height}%`, animationDelay: `${(index % 8) * 90}ms` }}
          className={cn(
            "w-[3px] origin-center rounded-full transition-colors",
            active ? "bg-primary motion-safe:animate-wave-bar" : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}
