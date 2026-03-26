import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const makeQb = (v: any = { data: [], error: null }) => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve(v).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return qb;
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => makeQb()), channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })), removeChannel: vi.fn() } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" }, loading: false }) }));
vi.mock("@/hooks/useAlerts", () => ({ useAlerts: () => ({ alerts: [], stats: { total: 0 }, resolveAlert: vi.fn(), dismissAll: vi.fn() }) }));
vi.mock("@/hooks/useRealtimeDriverMap", () => ({ useRealtimeDriverMap: () => ({ drivers: [], loading: false }) }));
vi.mock("@/components/LoadDetailPanel", () => ({ default: () => null }));
vi.mock("@/components/LiveDriverMap", () => ({ default: () => <div data-testid="map" /> }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("recharts", () => ({ ResponsiveContainer: ({ children }: any) => <div>{children}</div>, AreaChart: () => <div />, Area: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null }));
import CommandCenter from "./CommandCenter";
describe("CommandCenter", () => {
  it("renders without crashing", async () => { render(<CommandCenter />); await waitFor(() => expect(document.body).toBeDefined()); });
  it("renders a non-empty page after loading", async () => {
    const { container } = render(<CommandCenter />);
    await waitFor(() => expect(container.innerHTML.length).toBeGreaterThan(100));
  });
  it("renders without error when alerts are empty", async () => {
    const { container } = render(<CommandCenter />);
    await waitFor(() => expect(container.innerHTML.length).toBeGreaterThan(0));
  });
});
