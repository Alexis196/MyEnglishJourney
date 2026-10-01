"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Coffee, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import type { EnsureLessonResponse } from "@myenglishjourney/shared";
import { useCompleteRestDay, useDayLessonStatus, useEnsureDayLesson } from "../../hooks/useDayLesson";
import { useLearningPlan } from "../../hooks/useLearningPlan";
import { ApiError } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";

/**
 * Opens a plan day: when its lesson already exists it goes straight to it; otherwise it asks the server to prepare
 * it ("Preparando tu lección…") and follows the result. Rest days are confirmed here instead.
 */
export function DayPreparePage() {
  const { dayId } = useParams<{ dayId: string }>();
  const router = useRouter();
  const { data: planData, isLoading: planLoading } = useLearningPlan();
  const ensure = useEnsureDayLesson();
  const completeRest = useCompleteRestDay();
  const [result, setResult] = useState<EnsureLessonResponse | null>(null);
  const started = useRef(false);

  const day = planData?.days.find((d) => d.id === dayId);
  const isRest = day?.dayType === "rest";

  const start = () => {
    setResult(null);
    ensure.mutate(dayId, { onSuccess: setResult });
  };

  // Kick off (once) as soon as we know the day. The server call is idempotent, so a double mount is harmless.
  useEffect(() => {
    if (!day || started.current || isRest) return;
    if (day.lessonId) {
      router.replace(`/program/lessons/${day.lessonId}`);
      return;
    }
    started.current = true;
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, isRest]);

  // Another tab/request is generating: poll the status until it is ready or failed.
  const polling = useDayLessonStatus(dayId, result?.status === "generating");
  useEffect(() => {
    if (polling.data && polling.data.status !== "generating") setResult(polling.data);
  }, [polling.data]);

  useEffect(() => {
    if (result?.status === "ready" && result.lessonId) router.replace(`/program/lessons/${result.lessonId}`);
  }, [result, router]);

  const back = () => router.push("/program");

  if (planLoading) return <CardSkeleton />;

  if (!day) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="No encontramos este día"
        description="Puede que pertenezca a otro plan."
        action={
          <Button variant="outline" onClick={back}>
            Volver al programa
          </Button>
        }
      />
    );
  }

  if (isRest) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Coffee className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-ink">Día {day.dayNumber}: descanso</h2>
        <p className="max-w-sm text-sm text-muted">
          Hoy no hay lección. Descansar también es parte de aprender. Cuando quieras, marcalo como hecho para abrir el
          siguiente día.
        </p>
        {day.status === "completed" ? (
          <Button variant="outline" onClick={back}>
            Volver al programa
          </Button>
        ) : (
          <Button
            isLoading={completeRest.isPending}
            onClick={() => completeRest.mutate(day.id, { onSuccess: back })}
            className="mt-2"
          >
            Marcar como hecho
          </Button>
        )}
      </Card>
    );
  }

  const apiError = ensure.error instanceof ApiError ? ensure.error : null;
  const failed = result?.status === "failed" || Boolean(ensure.error);

  if (failed) {
    const message =
      apiError?.message ?? result?.message ?? "No pudimos preparar tu lección. Probá de nuevo en un momento.";
    // Unlock / limit problems will not fix themselves by retrying right away.
    const canRetry = !apiError || apiError.status >= 500;
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No se pudo preparar la lección"
        description={message}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={back}>
              Volver al programa
            </Button>
            {canRetry && (
              <Button
                onClick={() => {
                  ensure.reset();
                  start();
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
              </Button>
            )}
          </div>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-ink">Preparando tu lección…</h2>
      <p className="max-w-sm text-sm text-muted">
        Estamos armando la clase del día {day.dayNumber}
        {day.theme ? `: ${day.theme}` : ""}, a tu nivel y con lo que viste hasta ahora. Puede tardar unos segundos.
      </p>
    </Card>
  );
}
