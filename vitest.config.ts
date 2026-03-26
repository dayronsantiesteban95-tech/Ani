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
        "src/integrations/**",
        "src/test/**",
        "src/App.tsx",
        "src/main.tsx",
        "src/components/ui/toast.tsx",
        "src/components/ui/toaster.tsx",
        "src/components/ui/use-toast.ts",
        "src/components/ui/calendar.tsx",
        "src/components/ui/sidebar.tsx",
        "src/components/NotificationCenter.tsx",
        "src/components/MarketComparison.tsx",
        "src/components/LiveDriverMap.tsx",
        "src/components/AppLayout.tsx",
        "src/components/ui/sidebar-context.tsx",
        "src/components/RouteOptimizerPanel.tsx",
        "src/components/AiChatbot.tsx",
        "src/components/CommandBar.tsx",
        "src/pages/NurtureEngine.tsx",
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
