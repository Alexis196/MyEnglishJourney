"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "../ui/Logo";
import { ThemeToggle } from "./ThemeToggle";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const ART_SRCSET = "/images/login-london-sm.webp 900w, /images/login-london.webp 1600w";

/** Welcome panel (tablet/desktop): illustration anchored to the bottom, real HTML copy on top of it. */
function WelcomePanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-[#070A18] md:block">
      {/* Decorative scene. Taller than wide on purpose: cropped sideways (never stretched) it keeps the
          student, Big Ben and the London Eye in view, and its sky fades up into the panel behind the copy. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] lg:h-[68%]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-london.webp"
          srcSet={ART_SRCSET}
          sizes="(min-width: 1024px) 55vw, 45vw"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover object-[52%_bottom] lg:object-[28%_bottom] [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.55)_16%,black_36%)]"
        />
      </div>
      {/* very light left-to-right scrim for contrast, and soft ambient light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,20,0.45),rgba(5,8,20,0.08))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_15%_0%,rgba(84,84,247,0.28),transparent),radial-gradient(50%_40%_at_100%_30%,rgba(124,58,237,0.16),transparent)]"
      />

      <div className="relative z-10 flex h-full flex-col px-8 py-8 lg:px-12 lg:py-10">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10 rounded-xl shadow-glow" />
          <div>
            <p className="text-lg font-semibold leading-tight text-white">My English Journey</p>
            <p className="text-xs font-medium tracking-[0.2em] text-white/70">Learn • Practice • Grow</p>
          </div>
        </div>

        <div className="mt-8 max-w-[34rem] lg:mt-12">
          <h2 className="text-balance text-3xl font-bold leading-[1.1] tracking-tight text-white lg:text-5xl">
            Tu inglés,
            <br />
            tu próximo{" "}
            <span className="bg-gradient-to-r from-[#6FA5FF] via-[#8A8BFF] to-[#B88BFF] bg-clip-text text-transparent">
              gran paso.
            </span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 lg:text-base">
            Practicá, mejorá y alcanzá tus objetivos con un método pensado para acompañarte día a día.
          </p>
        </div>
      </div>
    </aside>
  );
}

/** Compact illustrated header for phones, where there is no room for two columns. */
function MobileHeader() {
  return (
    <header className="relative isolate h-44 overflow-hidden bg-[#070A18] md:hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/login-london-sm.webp"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover object-[38%_55%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,20,0.55),rgba(5,8,20,0.1))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--auth-panel)] to-transparent" />
      </div>
      <div className="relative z-10 flex items-center gap-3 px-5 pt-5">
        <Logo className="h-9 w-9 rounded-xl shadow-glow" />
        <div>
          <p className="text-base font-semibold leading-tight text-white">My English Journey</p>
          <p className="hidden text-[11px] font-medium tracking-[0.2em] text-white/75 min-[430px]:block">Learn • Practice • Grow</p>
        </div>
      </div>
    </header>
  );
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="auth-scope relative flex min-h-dvh flex-col bg-[var(--auth-panel)] text-[var(--auth-text)] transition-colors duration-300 md:grid md:grid-cols-[45fr_55fr] lg:grid-cols-[55fr_45fr]">
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-5">
        <ThemeToggle />
      </div>

      <MobileHeader />
      <WelcomePanel />

      <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-8 sm:px-8 md:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_85%_8%,var(--auth-glow-violet),transparent),radial-gradient(50%_40%_at_10%_95%,var(--auth-glow-blue),transparent)]"
        />

        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="relative z-10 flex w-full max-w-[460px] flex-col items-center gap-5"
        >
          <div className="hidden items-center gap-3 md:flex">
            <Logo className="h-11 w-11 rounded-xl shadow-glow" />
            <span className="text-lg font-semibold text-[var(--auth-text)]">My English Journey</span>
          </div>

          <div className="w-full rounded-3xl border border-[var(--auth-card-border)] bg-[var(--auth-card)] p-6 shadow-[var(--auth-card-shadow)] backdrop-blur-md transition-colors duration-300 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--auth-text)]">{title}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--auth-muted)]">{subtitle}</p>
            </div>
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
