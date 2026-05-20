import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18202A",
        paper: "#FAFAF8",
        rule: "#D9DED8",
        panel: "#F0F3F1",
        accent: "#2F6B8F",
        copper: "#B86E3D"
      },
      boxShadow: {
        soft: "0 14px 36px rgba(24, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
