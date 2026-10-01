"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
  confirmLabel: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small confirmation modal. The London skyline (same artwork as the sidebar) rises from the
 * bottom edge behind a free strip of the card, so it never sits under the text or buttons.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  icon: Icon,
  confirmLabel,
  cancelLabel = "Cancelar",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const prefersReducedMotion = useReducedMotion();
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the safe action on open, restore focus on close, close with Escape, and keep Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        event.stopPropagation();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, isLoading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[3px]"
            onClick={isLoading ? undefined : onCancel}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative isolate w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-card shadow-featured"
          >
            {/* Decorative skyline: bottom strip only, faded into the card above it. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute inset-x-0 bottom-0 h-36 bg-[image:var(--art-sidebar)] bg-cover bg-no-repeat bg-[position:28%_80%] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.7)_35%,black_70%)]" />
            </div>

            <div className="flex flex-col items-center gap-3 px-6 pb-36 pt-7 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow ring-1 ring-inset ring-white/15">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h2 id={titleId} className="text-lg font-semibold text-ink">
                {title}
              </h2>
              <p id={descriptionId} className="text-sm leading-relaxed text-muted">
                {description}
              </p>

              <div className="mt-2 flex w-full gap-2.5">
                <Button
                  ref={cancelRef}
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 backdrop-blur-sm"
                >
                  {cancelLabel}
                </Button>
                <Button onClick={onConfirm} isLoading={isLoading} className="flex-1">
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
