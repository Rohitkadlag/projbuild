/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["var(--font-display)", "system-ui"],
      },
      colors: {
        surface: {
          0: "#0a0a0b",
          1: "#111113",
          2: "#18181b",
          3: "#232329",
          4: "#2e2e35",
        },
        border: {
          DEFAULT: "#2e2e35",
          subtle: "#1e1e23",
          bright: "#3d3d47",
        },
        accent: {
          DEFAULT: "#6366f1",
          dim: "#4f52c7",
          bright: "#818cf8",
          glow: "rgba(99,102,241,0.25)",
        },
        text: {
          primary: "#f0f0f5",
          secondary: "#8b8b9a",
          muted: "#52525e",
          accent: "#818cf8",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      animation: {
        "slide-in-left": "slideInLeft 0.2s ease-out",
        "slide-in-right": "slideInRight 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        slideInLeft: {
          from: { transform: "translateX(-8px)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        slideInRight: {
          from: { transform: "translateX(8px)", opacity: 0 },
          to: { transform: "translateX(0)", opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        scaleIn: {
          from: { transform: "scale(0.95)", opacity: 0 },
          to: { transform: "scale(1)", opacity: 1 },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(99,102,241,0.3)" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "radial-gradient(circle, #2e2e35 1px, transparent 1px)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      backgroundSize: {
        "grid-sm": "20px 20px",
        "grid-md": "32px 32px",
      },
      boxShadow: {
        "glow-accent": "0 0 20px rgba(99,102,241,0.4)",
        "glow-sm": "0 0 10px rgba(99,102,241,0.2)",
        "layer-1": "0 1px 3px rgba(0,0,0,0.5)",
        "layer-2": "0 4px 16px rgba(0,0,0,0.4)",
        "layer-3": "0 8px 32px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
