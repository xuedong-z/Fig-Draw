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
        // App chrome (dark)
        canvas: "#0e1116", // deepest app background
        panel: "#161b22", // side panels
        elevated: "#1c2230", // cards / inputs
        hover: "#222b38", // hover state
        line: "#2a313c", // subtle borders
        "line-strong": "#3a4452",
        // Text
        ink: "#e6edf3", // primary text on dark
        muted: "#8b949e", // secondary text
        faint: "#6b7280", // de-emphasized
        // Brand / accent
        accent: "#4c8dff",
        "accent-hover": "#6ba1ff",
        "accent-soft": "#1f3a63",
        // Status
        good: "#3fb950",
        warn: "#d29922",
        bad: "#f85149",
        // Paper (the simulated journal page)
        paper: "#ffffff",
        "paper-ink": "#1a1a1a"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Arial", "sans-serif"],
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        figure: ["Arial", "Helvetica", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "Consolas", "monospace"]
      },
      boxShadow: {
        panel: "0 8px 24px rgba(0,0,0,0.35)",
        paper: "0 10px 40px rgba(0,0,0,0.45)",
        pop: "0 4px 16px rgba(0,0,0,0.5)"
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "0.875rem" }]
      }
    }
  },
  plugins: []
};

export default config;
