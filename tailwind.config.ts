import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3478F6",
          dark: "#1E3A8A",
        },
        secondary: {
          DEFAULT: "#7C3AED",
          light: "#A78BFA",
        },
        surface: {
          dark: "#080A0F",
          "card-dark": "#11141C",
          "raised-dark": "#151923",
          "high-dark": "#191D28",
          light: "#F4F4F5",
        },
        ink: "#F7F8FC",
        // Light/dark values live in globals.css so `text-muted` adapts to the theme.
        muted: "var(--color-muted)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #3478F6 0%, #5454F7 48%, #7C3AED 100%)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 12px 0 rgb(0 0 0 / 0.06)",
        "soft-dark": "0 8px 30px -12px rgb(0 0 0 / 0.6)",
        glow: "0 10px 30px -10px rgb(52 120 246 / 0.55)",
        "glow-violet": "0 10px 30px -10px rgb(124 58 237 / 0.5)",
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
