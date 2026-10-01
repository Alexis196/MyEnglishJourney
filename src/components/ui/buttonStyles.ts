const base = [
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200",
  "motion-safe:hover:-translate-y-px active:scale-[0.98]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0",
].join(" ");

/** Shared looks for the app's main call to action (PrimaryButton / PrimaryLink). */
export const primaryActionClasses = {
  brand: `${base} bg-brand-gradient text-white shadow-glow ring-1 ring-inset ring-white/15 hover:brightness-110`,
  // Hero CTA: brand gradient on the light theme; white on the dark theme's bright gradient illustration.
  hero: `${base} bg-brand-gradient text-white shadow-glow ring-1 ring-inset ring-white/15 hover:brightness-110 dark:bg-none dark:bg-white dark:text-[#2447C8] dark:ring-0 dark:hover:bg-white/90 dark:hover:brightness-100`,
} as const;

export type PrimaryTone = keyof typeof primaryActionClasses;
