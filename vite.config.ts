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
            // ── Radix UI + its transitive deps (must be before vendor-react
            //    so @floating-ui/react-dom doesn't match /react-dom/) ──
            if (
              id.includes("/@radix-ui/") ||
              id.includes("/@floating-ui/") ||
              id.includes("/react-remove-scroll") ||
              id.includes("/react-style-singleton/") ||
              id.includes("/use-callback-ref/") ||
              id.includes("/use-sidecar/") ||
              id.includes("/get-nonce/") ||
              id.includes("/aria-hidden/")
            ) {
              return "vendor-ui";
            }
            // ── React core + router ──
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/react-router-dom/") ||
              id.includes("/react-router/") ||
              id.includes("/@remix-run/router/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("/@tanstack/")) {
              return "vendor-query";
            }
            // ── Recharts + d3 + ALL transitive deps (lodash, react-smooth, etc.) ──
            if (
              id.includes("/recharts/") ||
              id.includes("/d3-") ||
              id.includes("/lodash/") ||
              id.includes("/react-smooth/") ||
              id.includes("/recharts-scale/") ||
              id.includes("/decimal.js-light/") ||
              id.includes("/eventemitter3/") ||
              id.includes("/fast-equals/") ||
              id.includes("/react-is/") ||
              id.includes("/prop-types/") ||
              id.includes("/internmap/")
            ) {
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
              id.includes("/clsx/") ||
              id.includes("/tailwind-merge/") ||
              id.includes("/class-variance-authority/")
            ) {
              return "vendor-utils";
            }
            // date-fns: let it code-split naturally with lazy pages that use it
            // (no eagerly-loaded code imports it any more)
            if (id.includes("/date-fns/")) {
              return;
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
              id.includes("/react-day-picker/") ||
              // Let remaining small deps (style-to-js, tiny-invariant, etc.)
              // code-split naturally with their importing pages
              id.includes("/style-to-js/") ||
              id.includes("/style-to-object/") ||
              id.includes("/inline-style-parser/") ||
              id.includes("/html-url-attributes/") ||
              id.includes("/trim-lines/") ||
              id.includes("/extend/") ||
              id.includes("/@ungap/") ||
              id.includes("/tiny-invariant/") ||
              id.includes("/iceberg-js/") ||
              id.includes("/tslib/")
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
