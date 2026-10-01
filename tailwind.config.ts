import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic, theme-aware tokens: values live in globals.css (:root = light, :root.dark = dark).
        primary: {
          DEFAULT: "rgb(var(--c-primary) / <alpha-value>)",
          dark: "#1E3A8A",
        },
        secondary: {
          DEFAULT: "rgb(var(--c-secondary) / <alpha-value>)",
          light: "#A78BFA",
        },
        page: "rgb(var(--c-page) / <alpha-value>)",
        card: "rgb(var(--c-card) / <alpha-value>)",
        soft: "rgb(var(--c-soft) / <alpha-value>)",
        tint: "var(--tint)",
        track: "var(--track)",
        hover: "var(--hover)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        "ink-2": "rgb(var(--c-ink2) / <alpha-value>)",
        muted: "var(--color-muted)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        link: "rgb(var(--c-link) / <alpha-value>)",
        "secondary-text": "rgb(var(--c-secondary-text) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "var(--brand-gradient)",
        "progress-bar": "var(--progress-bar)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        raised: "var(--shadow-raised)",
        hover: "var(--shadow-hover)",
        featured: "var(--shadow-featured)",
        glow: "var(--shadow-glow)",
        "glow-violet": "var(--shadow-glow-violet)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "wave-bar": {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "wave-bar": "wave-bar 1s ease-in-out infinite",
      },
    },
  },
  plugins: [containerQueries],
};

export default config;
