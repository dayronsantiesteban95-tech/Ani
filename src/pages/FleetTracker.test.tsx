import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FleetTracker from "./FleetTracker";

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

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe("FleetTracker", () => {
  it("renders the Fleet Tracker heading", async () => {
    render(<FleetTracker />);
    expect(await screen.findByText("Fleet Tracker")).toBeInTheDocument();
  });

  it("renders the three tab buttons", async () => {
    render(<FleetTracker />);
    expect(await screen.findByRole("tab", { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /maintenance/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /drivers/i })).toBeInTheDocument();
  });

  it("renders the Add Vehicle button", async () => {
    render(<FleetTracker />);
    expect(await screen.findByRole("button", { name: /add vehicle/i })).toBeInTheDocument();
  });

  it("renders the subtitle description", async () => {
    render(<FleetTracker />);
    expect(await screen.findByText(/Vehicle management, maintenance scheduling/i)).toBeInTheDocument();
  });

  it("renders the container element after loading", async () => {
    const { container } = render(<FleetTracker />);
    await screen.findByText("Fleet Tracker");
    expect(container.querySelector(".space-y-4")).toBeTruthy();
  });
});
