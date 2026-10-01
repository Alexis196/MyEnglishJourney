"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "../../utils/cn";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

/** Large, icon-led field for the login/register screens. Password fields get a show/hide toggle. */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput(
  { label, icon: Icon, error, type = "text", className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--auth-label)]">
        {label}
      </label>

      <div className="group relative">
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--auth-input-icon)] transition-colors duration-200 group-focus-within:text-primary"
        />
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-[54px] w-full rounded-[14px] border bg-[var(--auth-input-bg)] pl-12 text-[15px] text-[var(--auth-text)]",
            "placeholder:text-[var(--auth-input-icon)] transition-[border-color,box-shadow,background-color] duration-200",
            "focus:outline-none",
            isPassword ? "pr-14" : "pr-4",
            error
              ? "border-[var(--auth-error-border)] focus:border-[var(--auth-error)] focus:shadow-[0_0_0_3px_rgba(224,100,110,0.16)]"
              : "border-[var(--auth-input-border)] hover:border-[#3478F6]/40 focus:border-[#3478F6] focus:shadow-[0_0_0_3px_rgba(52,120,246,0.14)]",
            className,
          )}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={revealed}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--auth-input-icon)] transition-colors duration-200 hover:text-[var(--auth-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {revealed ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[13px] leading-snug text-[var(--auth-error)]">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});
