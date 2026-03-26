import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("/@tanstack/")) {
              return "vendor-query";
            }
            if (id.includes("/@radix-ui/")) {
              return "vendor-ui";
            }
            if (id.includes("/recharts/") || id.includes("/d3-")) {
              return "vendor-charts";
            }
            if (
              id.includes("/@supabase/") ||
              id.includes("/postgrest-js/") ||
              id.includes("/realtime-js/") ||
              id.includes("/storage-js/") ||
              id.includes("/gotrue-js/")
            ) {
              return "vendor-supabase";
            }
            if (
              id.includes("/date-fns/") ||
              id.includes("/clsx/") ||
              id.includes("/tailwind-merge/") ||
              id.includes("/class-variance-authority/")
            ) {
              return "vendor-utils";
            }
            if (id.includes("/lucide-react/")) {
              return "vendor-icons";
            }
            return "vendor-misc";
          }
        },
      },
    },
  },
}));
