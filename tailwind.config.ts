import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Flat-design palette: slate neutrals + a single blue accent (CTA).
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      transitionDuration: {
        DEFAULT: "180ms",
      },
      boxShadow: {
        // Flat design: very soft, low elevation only.
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        pop: "0 4px 16px -4px rgb(15 23 42 / 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
