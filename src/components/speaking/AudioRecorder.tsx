"use client";

import { useRef, useState } from "react";
import { Mic, Square, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
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

  if (state === "recorded" && recording) {
    return (
      <div className="flex flex-col gap-3">
        <audio controls src={recording.url} className="w-full" />
        <Button variant="outline" onClick={reset} disabled={disabled} className="w-fit">
          <RotateCcw className="h-4 w-4" /> Grabar de nuevo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
      {state === "recording" ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white"
          >
            <Mic className="h-6 w-6" />
          </motion.div>
          <p className="text-sm text-muted">Grabando... {elapsedSeconds}s</p>
          <Button variant="outline" onClick={stopRecording}>
            <Square className="h-4 w-4" /> Detener
          </Button>
        </>
      ) : (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mic className="h-6 w-6" />
          </div>
          <Button onClick={startRecording} isLoading={state === "requesting"} disabled={disabled}>
            Empezar a grabar
          </Button>
          {errorMessage && (
            <p className="text-sm text-red-500" role="alert">
              {errorMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
