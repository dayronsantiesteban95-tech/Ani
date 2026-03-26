import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "supabase/**",
        "src/integrations/supabase/types.ts",
        "src/test/**",
        "**/*.test.*",
        "**/*.d.ts",
        "dist/**",
        "node_modules/**",
        "*.config.*",
        ".autoimprove/**",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
