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
        "kinome-cyan": "#38bdf8",
        "kinome-violet": "#a855f7",
        "kinome-emerald": "#34d399",
        "kinome-dark": "#0b0f19",
        "kinome-card": "#0f1629",
      },
      backdropBlur: {
        xs: "2px",
        "3xl": "64px",
      },
      animation: {
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "gradient-drift": "gradient-drift 20s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "gradient-drift": {
          "0%": {
            background:
              "radial-gradient(ellipse 80% 50% at 20% 20%, rgba(56,189,248,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(168,85,247,0.06) 0%, transparent 60%)",
          },
          "50%": {
            background:
              "radial-gradient(ellipse 70% 60% at 40% 30%, rgba(168,85,247,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 60% 70%, rgba(56,189,248,0.06) 0%, transparent 60%)",
          },
          "100%": {
            background:
              "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(52,211,153,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 30% 70%, rgba(168,85,247,0.06) 0%, transparent 60%)",
          },
        },
      },
      boxShadow: {
        "glow-cyan":
          "0 0 20px rgba(56, 189, 248, 0.15), 0 0 40px rgba(56, 189, 248, 0.05)",
        "glow-cyan-strong":
          "0 0 24px rgba(56, 189, 248, 0.25), 0 0 48px rgba(56, 189, 248, 0.1)",
        "glow-violet":
          "0 0 20px rgba(168, 85, 247, 0.15), 0 0 40px rgba(168, 85, 247, 0.05)",
        "glow-violet-strong":
          "0 0 24px rgba(168, 85, 247, 0.25), 0 0 48px rgba(168, 85, 247, 0.1)",
        "glow-emerald":
          "0 0 20px rgba(52, 211, 153, 0.15), 0 0 40px rgba(52, 211, 153, 0.05)",
        "glow-emerald-strong":
          "0 0 24px rgba(52, 211, 153, 0.25), 0 0 48px rgba(52, 211, 153, 0.1)",
      },
    },
  },
  safelist: [
    "bg-amber-400/40",
    "text-amber-400",
    "bg-rose-500/40",
    "text-rose-500",
    "border-l-kinome-cyan",
    "border-l-kinome-violet",
    "border-l-kinome-emerald",
    "border-l-amber-400",
    "border-l-rose-500",
  ],
  plugins: [],
};

export default config;
