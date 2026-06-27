import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["var(--font-pixel)", "ui-monospace", "monospace"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"]
      },
      boxShadow: {
        window: "8px 8px 0 rgba(0, 0, 0, 0.16)",
        sticker: "3px 3px 0 rgba(0, 0, 0, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
