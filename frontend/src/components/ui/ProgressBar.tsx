import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../utils/cn";

interface ProgressBarProps {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
  "aria-label"?: string;
}

export function ProgressBar({ value, className, trackClassName, barClassName, ...props }: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={props["aria-label"]}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800", trackClassName, className)}
    >
      <motion.div
        className={cn("h-full rounded-full bg-brand-gradient", barClassName)}
        initial={{ width: prefersReducedMotion ? `${clamped}%` : 0 }}
        animate={{ width: `${clamped}%` }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}
