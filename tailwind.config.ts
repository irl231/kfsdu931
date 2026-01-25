import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  safelist: ["dark"],
  prefix: "",
  content: ["./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        blink: {
          "0%": { opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
      },
      animation: {
        blink: "blink 1.5s infinite",
      },
      colors: {
        app: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
          accent: "var(--accent)",
          text: {
            primary: "var(--text-primary)",
            secondary: "var(--text-secondary)",
            tertiary: "var(--text-tertiary)",
          },
        },
      },
    },
  },
};

export default config;
