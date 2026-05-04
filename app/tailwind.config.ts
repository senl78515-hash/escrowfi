import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark purple base — "Phantom-inspired" but distinct
        bg: {
          DEFAULT: "#100C1C",
          card: "#1A1430",
          surface: "#231D3F",
          hover: "#2A2350",
        },
        border: {
          DEFAULT: "#2D2550",
          subtle: "#1E1A35",
        },
        primary: {
          DEFAULT: "#8B5CF6",   // violet-500
          hover: "#7C3AED",     // violet-600
          light: "#A78BFA",     // violet-400
          dim: "rgba(139,92,246,0.15)",
        },
        accent: {
          DEFAULT: "#06B6D4",   // cyan-500
          dim: "rgba(6,182,212,0.15)",
        },
        text: {
          DEFAULT: "#F1EDFF",
          muted: "#9585C5",
          faint: "#5B5280",
        },
        success: {
          DEFAULT: "#10B981",
          dim: "rgba(16,185,129,0.15)",
        },
        warning: {
          DEFAULT: "#F59E0B",
          dim: "rgba(245,158,11,0.15)",
        },
        danger: {
          DEFAULT: "#EF4444",
          dim: "rgba(239,68,68,0.15)",
        },
        privacy: {
          DEFAULT: "#A78BFA",   // violet-400
          dim: "rgba(167,139,250,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(139,92,246,0.25), transparent)",
        "card-glow":
          "radial-gradient(ellipse 100% 100% at 50% 0%, rgba(139,92,246,0.08), transparent)",
        "purple-gradient": "linear-gradient(135deg, #8B5CF6, #06B6D4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
