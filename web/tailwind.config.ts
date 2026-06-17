// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#1B6CA8",
          secondary: "#16A34A",
          warning: "#D97706",
          error: "#DC2626",
        },
        neutral: {
          dark: "#1E293B",
          mid: "#64748B",
          light: "#F8FAFC",
          border: "#CBD5E1",
        },
      },
      fontSize: {
        display: ["30px", { lineHeight: "36px", fontWeight: "700" }],
        title: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        small: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        tiny: ["11px", { lineHeight: "16px", fontWeight: "400" }],
      },
      width: {
        sidebar: "240px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
