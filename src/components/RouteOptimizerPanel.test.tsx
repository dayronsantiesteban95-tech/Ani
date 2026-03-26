import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/hooks/useRouteOptimizer", () => ({ useRouteOptimizer: () => ({ optimizedRoute: null, isOptimizing: false, optimize: vi.fn(), error: null }) }));
vi.mock("@/integrations/supabase/client", () => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve({ data: [], error: null }).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return { supabase: { from: vi.fn(() => qb) } };
});
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import RouteOptimizerPanel from "./RouteOptimizerPanel";
describe("RouteOptimizerPanel", () => {
  it("renders header", () => { render(<RouteOptimizerPanel loads={[]} />); expect(screen.getByText(/Route Optimizer/i)).toBeInTheDocument(); });
});
