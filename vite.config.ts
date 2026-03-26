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
    target: "es2022",
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
            // Heavy page-specific deps: let them code-split naturally
            // with the lazy-loaded pages that import them, instead of
            // forcing everything into one giant vendor-misc chunk.
            if (
              id.includes("/react-markdown/") ||
              id.includes("/remark-") ||
              id.includes("/rehype-") ||
              id.includes("/unified/") ||
              id.includes("/micromark") ||
              id.includes("/mdast-") ||
              id.includes("/hast-") ||
              id.includes("/unist-") ||
              id.includes("/vfile") ||
              id.includes("/devlop/") ||
              id.includes("/ccount/") ||
              id.includes("/comma-separated-tokens/") ||
              id.includes("/property-information/") ||
              id.includes("/space-separated-tokens/") ||
              id.includes("/stringify-entities/") ||
              id.includes("/character-entities") ||
              id.includes("/html-void-elements/") ||
              id.includes("/longest-streak/") ||
              id.includes("/markdown-table/") ||
              id.includes("/zwitch/") ||
              id.includes("/is-plain-obj/") ||
              id.includes("/bail/") ||
              id.includes("/trough/") ||
              id.includes("/decode-named-character-reference/") ||
              id.includes("/estree-") ||
              id.includes("/react-day-picker/")
            ) {
              return;  // natural code-split with importing page
            }
            return "vendor-misc";
          }
        },
      },
    },
  },
}));
