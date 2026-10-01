"use client";

import { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "../../components/ui/Button";
import {
  AudioRecorder,
  type Recording,
} from "../../components/speaking/AudioRecorder";
import { SpeakingCard } from "../../components/speaking/SpeakingCard";
import { SpeakingFeedbackResult } from "../../components/speaking/SpeakingFeedbackResult";
import { useSubmitSpeakingRecording } from "../../hooks/useSubmitSpeakingRecording";
import { useToast } from "../../context/ToastProvider";
import { useLearningPlan } from "../../hooks/useLearningPlan";
import { useProfile } from "../../hooks/useProfile";
import { CardSkeleton } from "../../components/ui/Skeleton";
import {
  pickSpeakingQuestion,
  speakingTopicsFor,
  type CefrLevel,
  type SpeakingQuestion,
} from "@myenglishjourney/shared";

export function SpeakingLabPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: planData, isLoading: planLoading } = useLearningPlan();
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  // Set once the student reveals the Spanish version of the current question (sent with the recording, never penalized).
  const [usedTranslation, setUsedTranslation] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const submitRecording = useSubmitSpeakingRecording();
  const { showToast } = useToast();

  const canSubmit = useMemo(
    () => Boolean(recording) && !submitRecording.isPending,
    [recording, submitRecording.isPending],
  );

  // Questions follow the student's level and what their own profile says they care about.
  const topics = useMemo(
    () => speakingTopicsFor(planData?.plan?.personalization ?? {}),
    [planData?.plan?.personalization],
  );
  const level = (profile?.currentLevel ?? null) as CefrLevel | null;

  const nextQuestion = (exclude?: string) => {
    setQuestion(pickSpeakingQuestion({ level, topics, excludeEn: exclude }));
    setShowTranslation(false);
    setUsedTranslation(false);
  };

  useEffect(() => {
    if (!question && !profileLoading && !planLoading) nextQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, profileLoading, planLoading]);

  const handleToggleTranslation = () => {
    setShowTranslation((shown) => !shown);
    setUsedTranslation(true);
  };

  const handleNewQuestion = () => {
    nextQuestion(question?.en);
    setRecording(null);
    submitRecording.reset();
  };

  const handleSubmit = async () => {
    if (!recording || !question) return;
    try {
      await submitRecording.mutateAsync({
        question: question.en,
        usedTranslation,
        mimeType: recording.mimeType as
          "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/wav" | "audio/mpeg",
        durationSeconds: recording.durationSeconds,
        blob: recording.blob,
      });
    } catch {
      showToast("No se pudo enviar tu grabación. Intentá de nuevo.", "error");
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">Speaking Lab</h1>
        <p className="text-sm text-muted">
          Practicá respondiendo en voz alta. La IA analiza lo que dijiste.
        </p>
      </div>

      {!question ? (
        <CardSkeleton />
      ) : (
        <SpeakingCard
          question={question.en}
          translation={question.es}
          showTranslation={showTranslation}
          onToggleTranslation={handleToggleTranslation}
          onNewQuestion={handleNewQuestion}
          newQuestionDisabled={submitRecording.isPending}
        >
          <div className="flex flex-col gap-4">
            <AudioRecorder
              onRecordingReady={setRecording}
              disabled={submitRecording.isPending}
            />

            {recording && !submitRecording.data && (
              <Button
                onClick={handleSubmit}
                isLoading={submitRecording.isPending}
                disabled={!canSubmit}
                className="w-fit"
              >
                {submitRecording.isPending ? (
                  "Analizando tu respuesta..."
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar para análisis
                  </>
                )}
              </Button>
            )}
          </div>
        </SpeakingCard>
      )}

      {submitRecording.data && (
        <SpeakingFeedbackResult result={submitRecording.data} />
      )}

      {submitRecording.data && (
        <Button variant="outline" onClick={handleNewQuestion} className="w-fit">
          Practicar otra pregunta
        </Button>
      )}
    </div>
  );
}
