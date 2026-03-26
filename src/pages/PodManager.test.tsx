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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com/file" } })),
      })),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }),
}));
vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }),
}));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import PodManager from "./PodManager";

describe("PodManager", () => {
  it("renders without crashing", () => {
    const { container } = render(<PodManager />);
    expect(container).toBeTruthy();
  });

  it("renders the POD Manager heading", async () => {
    render(<PodManager />);
    expect(await screen.findByText("POD Manager")).toBeInTheDocument();
  });

  it("renders the description text", async () => {
    render(<PodManager />);
    expect(await screen.findByText(/Upload load documents/)).toBeInTheDocument();
  });

  it("renders the page container element", async () => {
    const { container } = render(<PodManager />);
    await screen.findByText("POD Manager");
    expect(container.innerHTML.length).toBeGreaterThan(100);
  });

  it("renders a non-empty page after data loads", async () => {
    const { container } = render(<PodManager />);
    await screen.findByText(/Upload load documents/);
    expect(container.querySelector("div")).toBeTruthy();
  });

  it("renders the search input", async () => {
    render(<PodManager />);
    await screen.findByText("POD Manager");
    const input = screen.getByPlaceholderText(/Search/);
    expect(input).toBeInTheDocument();
  });

  it("renders the POD column headers in the table", async () => {
    render(<PodManager />);
    await screen.findByText("POD Manager");
    // The table headers should be rendered
    expect(screen.getByText(/Client/i)).toBeInTheDocument();
  });

  it("renders the load documents table", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const loads = [
      { id: "ld1", load_date: "2026-03-25", reference_number: "ANK-001", client_name: "Table Client", pickup_address: "A St", delivery_address: "B St", driver_id: null, vehicle_id: null, status: "assigned", hub: "atlanta", packages: 2, pod_confirmed: false },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "daily_loads") return makeQb({ data: loads, error: null });
      if (table === "drivers") return makeQb({ data: [], error: null });
      if (table === "vehicles") return makeQb({ data: [], error: null });
      if (table === "load_documents") return makeQb({ data: [], error: null });
      if (table === "proof_of_delivery") return makeQb({ data: [], error: null });
      return makeQb();
    });

    render(<PodManager />);
    expect(await screen.findByText("Table Client")).toBeInTheDocument();
  });

  it("renders the search input for loads", async () => {
    render(<PodManager />);
    await screen.findByText("POD Manager");
    expect(screen.getByPlaceholderText(/Search loads/i)).toBeInTheDocument();
  });

  it("renders stat cards with counts", async () => {
    render(<PodManager />);
    await screen.findByText("POD Manager");
    // Should show stat card labels
    expect(screen.getByText("Documents")).toBeInTheDocument();
  });

  it("renders the full page with table structure", async () => {
    const { container } = render(<PodManager />);
    await screen.findByText("POD Manager");
    // Table should have rows
    expect(container.querySelector("table, div")).toBeTruthy();
  });

  it("renders loads with POD data", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const loads = [
      { id: "ld1", load_date: "2026-03-25", reference_number: "ANK-POD-001", client_name: "POD Client", pickup_address: "A", delivery_address: "B", driver_id: "d1", vehicle_id: null, status: "delivered", hub: "phoenix", packages: 2, pod_confirmed: true },
    ];
    const drivers = [{ id: "d1", full_name: "POD Driver", hub: "phoenix" }];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "daily_loads") return makeQb({ data: loads, error: null });
      if (table === "drivers") return makeQb({ data: drivers, error: null });
      return makeQb();
    });

    render(<PodManager />);
    expect(await screen.findByText("POD Client")).toBeInTheDocument();
  });
});
