"use client";

import type { ButtonHTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "../../utils/cn";

interface AuthSubmitButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  isLoading?: boolean;
  /** Text shown next to the spinner while submitting. */
  loadingText: string;
}

/** Full-width brand CTA of the auth screens. Reflects the form's existing submitting state; adds no logic. */
export function AuthSubmitButton({ isLoading = false, loadingText, children, className, disabled, ...props }: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        "group inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-[14px] bg-brand-gradient text-sm font-semibold uppercase tracking-wider text-white",
        "shadow-[0_10px_28px_-10px_rgba(84,84,247,0.65)] ring-1 ring-inset ring-white/15 transition-all duration-200",
        "hover:-translate-y-px hover:brightness-110 hover:shadow-[0_14px_34px_-10px_rgba(84,84,247,0.8)] active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3478F6] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--auth-panel)]",
        "motion-reduce:transform-none motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:brightness-100",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
        </>
      )}
    </button>
  );
}
