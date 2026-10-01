"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Logo } from "../ui/Logo";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-light px-4 dark:bg-surface-dark">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-soft dark:border-white/[0.06] dark:bg-surface-card-dark"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="h-11 w-11 rounded-xl" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-ink">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
