import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    optimizeDeps: {
      include: ["@phosphor-icons/react"],
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      target: "es2020",
      cssMinify: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes("node_modules/react") ||
              id.includes("node_modules/react-dom")
            ) {
              return "react-vendor";
            }
            if (id.includes("node_modules/@supabase")) {
              return "supabase-vendor";
            }
            if (id.includes("node_modules/@tanstack/react-query")) {
              return "query-vendor";
            }
            if (id.includes("node_modules/@tanstack/react-router")) {
              return "router-vendor";
            }
            if (id.includes("node_modules/recharts")) {
              return "chart-vendor";
            }
          },
        },
      },
    },

    server: {
      port: 5173,
      proxy: {
        "/api-proxy": {
          target: env.VITE_API_URL ?? "http://localhost:8080",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api-proxy/, ""),
        },
      },
    },
  };
});
