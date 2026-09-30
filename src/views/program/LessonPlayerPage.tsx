"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { useLesson, useUpdateLessonProgress } from "../../hooks/useLesson";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { LessonStepper } from "../../components/lesson/LessonStepper";
import { useToast } from "../../context/ToastProvider";

export function LessonPlayerPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const { data: lesson, isLoading } = useLesson(lessonId);
  const updateProgress = useUpdateLessonProgress(lessonId);
  const { showToast } = useToast();
  const [justCompleted, setJustCompleted] = useState(false);

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  if (isLoading) {
    return <CardSkeleton />;
  }

  if (!lesson) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="No encontramos esta clase"
        description="Puede que ya no esté disponible o que no tengas acceso a ella."
        action={
          <Button onClick={() => router.push("/program")} variant="outline">
            Volver al programa
          </Button>
        }
      />
    );
  }

  const activeIndex = currentIndex ?? lesson.currentSectionIndex;

  const handleNavigate = async (nextIndex: number, isCompleting: boolean) => {
    if (isCompleting) {
      try {
        await updateProgress.mutateAsync({ currentSectionIndex: activeIndex, status: "completed" });
        setJustCompleted(true);
      } catch {
        showToast("No se pudo guardar tu progreso. Intentá de nuevo.", "error");
      }
      return;
    }

    const clamped = Math.max(0, Math.min(nextIndex, lesson.sections.length - 1));
    setCurrentIndex(clamped);
    try {
      await updateProgress.mutateAsync({ currentSectionIndex: clamped, status: "in_progress" });
    } catch {
      showToast("No se pudo guardar tu progreso automáticamente.", "error");
    }
  };

  if (justCompleted || lesson.status === "completed") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">¡Clase completada!</h2>
          <p className="max-w-sm text-sm text-muted">
            Excelente trabajo. Tu progreso se guardó y ya está disponible el siguiente día del programa.
          </p>
          <Button onClick={() => router.push("/program")} className="mt-2">
            Volver al programa
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          onClick={() => router.push("/program")}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al programa
        </button>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{lesson.title}</h1>
        {lesson.objective && <p className="text-sm text-muted">{lesson.objective}</p>}
      </div>

      <LessonStepper
        lesson={lesson}
        currentIndex={activeIndex}
        onNavigate={handleNavigate}
        isSaving={updateProgress.isPending}
      />
    </div>
  );
}
