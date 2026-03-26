import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DriverPortal from "./DriverPortal";

function makeQb(resolveValue: any = { data: null, error: null }) {
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
    storage: { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ error: null }) })) },
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }) }));
vi.mock("@/hooks/useDriverGPS", () => ({
  useDriverGPS: () => ({
    position: null,
    tracking: false,
    pingCount: 0,
    lastPingAt: null,
    permissionStatus: "prompt",
    requestPermission: vi.fn().mockResolvedValue(true),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
  }),
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const { supabase } = await import("@/integrations/supabase/client");

describe("DriverPortal", () => {
  it("shows loading text on initial render", () => {
    render(<DriverPortal />);
    expect(screen.getByText("Loading Driver Portal...")).toBeInTheDocument();
  });

  it("shows 'Driver Profile Not Found' after loading completes with no driver", async () => {
    render(<DriverPortal />);
    expect(await screen.findByText("Driver Profile Not Found")).toBeInTheDocument();
  });

  it("shows a message to contact dispatcher when profile not found", async () => {
    render(<DriverPortal />);
    expect(
      await screen.findByText(/your account isn't linked to a driver profile/i),
    ).toBeInTheDocument();
  });

  it("renders the driver portal with driver name when profile is found", async () => {
    // Override mock: the drivers table call with .single() returns a driver
    const driverData = { id: "d1", full_name: "Alice Smith", hub: "phoenix", status: "active" };
    let callIdx = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const qb = makeQb({ data: null, error: null });
      if (table === "drivers" && callIdx === 0) {
        callIdx++;
        // Override the final thenable to return a single driver
        const singleQb = makeQb({ data: driverData, error: null });
        return singleQb;
      }
      if (table === "driver_shifts") {
        return makeQb({ data: null, error: { code: "PGRST116", message: "no rows" } });
      }
      if (table === "daily_loads") {
        return makeQb({ data: [], error: null });
      }
      return qb;
    });

    render(<DriverPortal />);
    expect(await screen.findByText(/Alice Smith/i)).toBeInTheDocument();
  });

  it("renders the shift status section when profile exists", async () => {
    const driverData = { id: "d1", full_name: "Alice Smith", hub: "phoenix", status: "active" };
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "drivers") {
        return makeQb({ data: driverData, error: null });
      }
      if (table === "driver_shifts") {
        return makeQb({ data: null, error: { code: "PGRST116", message: "no rows" } });
      }
      return makeQb({ data: [], error: null });
    });

    render(<DriverPortal />);
    // Should show shift status text ("Off Duty" since no active shift)
    expect(await screen.findByText(/Off Duty/)).toBeInTheDocument();
  });
});
