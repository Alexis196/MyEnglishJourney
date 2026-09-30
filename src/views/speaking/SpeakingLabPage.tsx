"use client";

import { useMemo, useState } from "react";
import { Shuffle, Send } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AudioRecorder, type Recording } from "../../components/speaking/AudioRecorder";
import { SpeakingFeedbackResult } from "../../components/speaking/SpeakingFeedbackResult";
import { useSubmitSpeakingRecording } from "../../hooks/useSubmitSpeakingRecording";
import { useToast } from "../../context/ToastProvider";

const PRACTICE_QUESTIONS = [
  "Tell me about yourself and what you do for work.",
  "Describe your typical work day, from morning to evening.",
  "How do you usually communicate with your team when working remotely?",
  "Tell me about a challenging bug or problem you solved recently.",
  "Why are you interested in improving your English for your career?",
  "Describe a recent meeting you had at work. What was it about?",
  "What tools or technologies do you use most in your daily work?",
  "How would you introduce yourself to a new coworker on your first day?",
];

function pickRandomQuestion(exclude?: string): string {
  const options = PRACTICE_QUESTIONS.filter((q) => q !== exclude);
  return options[Math.floor(Math.random() * options.length)] ?? PRACTICE_QUESTIONS[0] ?? "";
}

export function SpeakingLabPage() {
  const [question, setQuestion] = useState(() => pickRandomQuestion());
  const [recording, setRecording] = useState<Recording | null>(null);
  const submitRecording = useSubmitSpeakingRecording();
  const { showToast } = useToast();

  const canSubmit = useMemo(() => Boolean(recording) && !submitRecording.isPending, [recording, submitRecording.isPending]);

  const handleNewQuestion = () => {
    setQuestion((current) => pickRandomQuestion(current));
    setRecording(null);
    submitRecording.reset();
  };

  const handleSubmit = async () => {
    if (!recording) return;
    try {
      await submitRecording.mutateAsync({
        question,
        mimeType: recording.mimeType as "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/wav" | "audio/mpeg",
        durationSeconds: recording.durationSeconds,
        blob: recording.blob,
      });
    } catch {
      showToast("No se pudo enviar tu grabación. Intentá de nuevo.", "error");
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Speaking Lab</h1>
        <p className="text-sm text-muted">Practicá respondiendo en voz alta. La IA analiza lo que dijiste.</p>
      </div>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">{question}</p>
          <Button variant="ghost" size="sm" onClick={handleNewQuestion} disabled={submitRecording.isPending}>
            <Shuffle className="h-4 w-4" /> Otra pregunta
          </Button>
        </div>

        <AudioRecorder onRecordingReady={setRecording} disabled={submitRecording.isPending} />

        {recording && !submitRecording.data && (
          <Button onClick={handleSubmit} isLoading={submitRecording.isPending} disabled={!canSubmit} className="mt-4 w-fit">
            {submitRecording.isPending ? (
              "Analizando tu respuesta..."
            ) : (
              <>
                <Send className="h-4 w-4" /> Enviar para análisis
              </>
            )}
          </Button>
        )}
      </Card>

      {submitRecording.data && <SpeakingFeedbackResult result={submitRecording.data} />}

      {submitRecording.data && (
        <Button variant="outline" onClick={handleNewQuestion} className="w-fit">
          Practicar otra pregunta
        </Button>
      )}
    </div>
  );
}
