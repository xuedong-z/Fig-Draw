import type { Config } from "tailwindcss";

/**
 * SciCompose uses a professional dark "tool" UI (Figma/VS Code feel) with a
 * white paper surface in the center. Colors are exposed as semantic tokens so
 * the whole app stays visually coherent.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // App chrome (light)
        canvas: "#ebecf0", // stage behind the white artboard
        panel: "#ffffff", // top bar / side panels (chrome)
        elevated: "#f5f5f7", // controls / inputs (--control)
        control: "#f5f5f7",
        hover: "#ececef",
        active: "#e7e8ee",
        line: "#e8e8ed", // hairline borders
        "line-strong": "#dcdce3",
        // Text
        ink: "#1b1b21", // primary (--tx-1)
        muted: "#62636e", // secondary (--tx-2)
        faint: "#9a9ba6", // de-emphasized (--tx-3)
        // Brand / accent (single)
        accent: "#5b63f0",
        "accent-hover": "#4d54e6",
        "accent-soft": "rgba(91,99,240,0.10)",
        // Status (tuned for light bg)
        good: "#1f9d57",
        warn: "#b07d12",
        bad: "#dc2626",
        // Paper (the simulated journal page / artboard)
        paper: "#ffffff",
        "paper-ink": "#1a1a1a"
      },
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        figure: ["Arial", "Helvetica", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "'JetBrains Mono'", "Consolas", "monospace"]
      },
      boxShadow: {
        sm: "0 1px 2px rgba(18,20,40,.06)",
        md: "0 4px 14px rgba(18,20,40,.10),0 1px 3px rgba(18,20,40,.07)",
        art: "0 1px 0 rgba(18,20,40,.04),0 18px 48px rgba(18,20,40,.14)",
        // legacy names mapped onto the light scale
        panel: "0 1px 2px rgba(18,20,40,.06)",
        paper: "0 1px 0 rgba(18,20,40,.04),0 18px 48px rgba(18,20,40,.14)",
        pop: "0 4px 14px rgba(18,20,40,.10),0 1px 3px rgba(18,20,40,.07)"
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }]
      }
    }
  },
  plugins: []
};

export default config;
