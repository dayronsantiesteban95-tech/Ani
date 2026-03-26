import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

function makeQb(resolveValue: any = { data: [], error: null }) {
  const qb: any = {};
  for (const m of ['select','insert','update','delete','upsert','eq','neq','gt','lt','gte','lte','like','ilike','in','is','order','limit','range','single','maybeSingle','match','not','or','filter','rpc','count','csv','on','subscribe','unsubscribe']) qb[m] = vi.fn().mockReturnValue(qb);
  qb.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return qb;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQb()),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock("@/lib/formatters", () => ({
  fmtMoney: (n: number) => `$${n.toFixed(2)}`,
  fmtWait: (m: number) => `${m}m`,
  todayISO: () => "2024-01-15",
  daysAgoISO: () => "2024-01-08",
}));
vi.mock("@/lib/constants", () => ({
  CITY_HUBS: [{ value: "phoenix", label: "Phoenix" }],
}));
vi.mock("@/lib/quickLoadHelpers", () => ({
  exportToCSV: vi.fn(),
  cloneLoadData: vi.fn(),
}));

// Mock all sub-components
vi.mock("@/components/LiveDriverMap", () => ({ default: () => <div data-testid="live-driver-map">LiveDriverMap</div> }));
vi.mock("@/components/IntegrationSyncPanel", () => ({ default: () => <div data-testid="integration-sync">IntegrationSync</div> }));
vi.mock("@/components/RouteOptimizerPanel", () => ({ default: () => <div data-testid="route-optimizer">RouteOptimizer</div> }));
vi.mock("@/components/CSVImportPanel", () => ({ default: () => <div data-testid="csv-import">CSVImport</div> }));
vi.mock("@/components/QuickLoadEntry", () => ({ default: () => <div data-testid="quick-load">QuickLoadEntry</div> }));
vi.mock("@/components/AutoDispatchPanel", () => ({ default: () => <div data-testid="auto-dispatch">AutoDispatch</div> }));
vi.mock("@/components/DispatchBlast", () => ({ default: () => <div data-testid="dispatch-blast">DispatchBlast</div> }));
vi.mock("@/components/CustomerOrderHistory", () => ({ default: () => <div data-testid="customer-history">CustomerHistory</div> }));
vi.mock("@/components/ActivityLog", () => ({ default: () => <div data-testid="activity-log">ActivityLog</div> }));
vi.mock("@/components/LoadDetailPanel", () => ({ default: () => <div data-testid="load-detail">LoadDetail</div> }));
vi.mock("@/hooks/useRealtimeDriverMap", () => ({
  useRealtimeDriverMap: () => ({ drivers: [], loading: false, refresh: vi.fn(), pollActive: false }),
}));

// Mock recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Cell: () => <div />,
}));

import DispatchTracker from "./DispatchTracker";

describe("DispatchTracker", () => {
  it("renders without crashing", () => {
    const { container } = render(<DispatchTracker />);
    expect(container).toBeTruthy();
  });

  it("renders the Dispatch Tracker heading", async () => {
    render(<DispatchTracker />);
    expect(await screen.findByText("Dispatch Tracker")).toBeInTheDocument();
  });

  it("renders the New Load button", async () => {
    render(<DispatchTracker />);
    expect(await screen.findByText("New Load")).toBeInTheDocument();
  });

  it("renders all four tab triggers", async () => {
    render(<DispatchTracker />);
    expect(await screen.findByRole("tab", { name: /Load Board/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Live Ops/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Wait Time/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Daily Report/i })).toBeInTheDocument();
  });

  it("renders the page container with content", async () => {
    const { container } = render(<DispatchTracker />);
    await screen.findByText("Dispatch Tracker");
    expect(container.innerHTML.length).toBeGreaterThan(200);
  });
});
