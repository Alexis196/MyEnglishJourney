import { cn } from "../../utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-surface-card-dark">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-7 w-2/3" />
      <Skeleton className="h-2 w-full" />
    </div>
  );
}
