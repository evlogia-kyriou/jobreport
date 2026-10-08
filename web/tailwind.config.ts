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
        // Custom semantic scale ✅
        display: ["30px", { lineHeight: "36px", fontWeight: "700" }],
        title: ["20px", { lineHeight: "28px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px", fontWeight: "400" }],
        small: ["13px", { lineHeight: "18px", fontWeight: "400" }],
        tiny: ["11px", { lineHeight: "16px", fontWeight: "400" }],
        // Bump Tailwind defaults slightly ✅
        xs: ["12.5px", { lineHeight: "18px" }], // was 12px
        sm: ["14px", { lineHeight: "21px" }], // unchanged, better line-height
        base: ["15px", { lineHeight: "23px" }], // was 16px → 15px
        lg: ["17px", { lineHeight: "26px" }], // was 18px
      },
      width: {
        sidebar: "240px", // ← used in Sidebar.tsx as w-60 ✅
      },
      spacing: {
        // Extra breathing room tokens ✅
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
} satisfies Config;
