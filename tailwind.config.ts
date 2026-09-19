import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#070B14",
        surface: {
          DEFAULT: "#0F172A",
          muted: "#131E36",
          elevated: "#1E293B",
          border: "#1E293B",
        },
        brand: {
          blue: "#3B82F6",
          violet: "#8B5CF6",
          cyan: "#06B6D4",
          amber: "#F59E0B",
          orange: "#F97316",
        },
        status: {
          live: "#10B981",
          upcoming: "#64748B",
          delayed: "#F59E0B",
          overtime: "#EF4444",
          emergency: "#DC2626",
          completed: "#3B82F6",
          skipped: "#94A3B8",
          cancelled: "#64748B",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
