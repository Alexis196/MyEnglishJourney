import { ProgressBar } from "../ui/ProgressBar";

export function LessonProgressBar({ current, total }: { current: number; total: number }) {
  const percent = total === 0 ? 0 : ((current + 1) / total) * 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Sección {Math.min(current + 1, total)} de {total}
        </span>
        <span>{Math.round(percent)}%</span>
      </div>
      <ProgressBar value={percent} aria-label="Progreso de la clase" />
    </div>
  );
}
