import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "../utils/cn";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const icons: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400",
  error: "border-red-200 text-red-700 dark:border-red-900 dark:text-red-400",
  info: "border-primary/30 text-primary",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = icons[toast.tone];
            return (
              <motion.div
                key={toast.id}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.95 }}
                className={cn(
                  "pointer-events-auto flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm shadow-soft dark:bg-surface-card-dark",
                  toneClasses[toast.tone],
                )}
                role="status"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="text-zinc-800 dark:text-zinc-100">{toast.message}</span>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-2 text-muted hover:text-zinc-700 dark:hover:text-zinc-200"
                  aria-label="Cerrar notificación"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
