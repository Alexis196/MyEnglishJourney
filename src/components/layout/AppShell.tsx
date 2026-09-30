"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-x-hidden bg-surface-light dark:bg-surface-dark">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={pathname}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mx-auto w-full max-w-5xl"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
