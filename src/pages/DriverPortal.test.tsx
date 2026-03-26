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

  it("renders active loads when driver has loads assigned", async () => {
    const driverData = { id: "d1", full_name: "Bob Driver", hub: "atlanta", status: "active" };
    const loadData = [
      { id: "load1", reference_number: "ANK-001", client_name: "Test Client", status: "assigned", packages: 3, service_type: "last_mile", pickup_address: "123 Pickup St", delivery_address: "456 Deliver Ave", hub: "atlanta", driver_id: "d1" },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "drivers") {
        return makeQb({ data: driverData, error: null });
      }
      if (table === "driver_shifts") {
        return makeQb({ data: null, error: { code: "PGRST116", message: "no rows" } });
      }
      if (table === "daily_loads") {
        return makeQb({ data: loadData, error: null });
      }
      return makeQb({ data: [], error: null });
    });

    render(<DriverPortal />);
    expect(await screen.findByText("Bob Driver")).toBeInTheDocument();
    expect(await screen.findByText("Test Client")).toBeInTheDocument();
    expect(screen.getByText(/Active Loads/)).toBeInTheDocument();
  });

  it("renders the Start Shift button when off duty", async () => {
    const driverData = { id: "d1", full_name: "Carol Driver", hub: "la", status: "active" };

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
    expect(await screen.findByText("Start Shift")).toBeInTheDocument();
  });

  it("renders no loads assigned message when driver has no loads", async () => {
    const driverData = { id: "d1", full_name: "Empty Driver", hub: "phoenix", status: "active" };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "drivers") {
        return makeQb({ data: driverData, error: null });
      }
      if (table === "driver_shifts") {
        return makeQb({ data: null, error: { code: "PGRST116", message: "no rows" } });
      }
      if (table === "daily_loads") {
        return makeQb({ data: [], error: null });
      }
      return makeQb({ data: [], error: null });
    });

    render(<DriverPortal />);
    expect(await screen.findByText("No loads assigned for today")).toBeInTheDocument();
  });

  it("renders the hub name properly formatted", async () => {
    const driverData = { id: "d1", full_name: "Hub Driver", hub: "atlanta", status: "active" };

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
    expect(await screen.findByText(/Atlanta Hub/)).toBeInTheDocument();
  });

  it("renders on duty badge when driver has active shift", async () => {
    const driverData = { id: "d1", full_name: "Active Driver", hub: "phoenix", status: "active" };
    const shiftData = { id: "sh1", driver_id: "d1", shift_start: new Date().toISOString(), shift_end: null };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "drivers") {
        return makeQb({ data: driverData, error: null });
      }
      if (table === "driver_shifts") {
        return makeQb({ data: shiftData, error: null });
      }
      return makeQb({ data: [], error: null });
    });

    render(<DriverPortal />);
    expect(await screen.findByText(/On Duty/)).toBeInTheDocument();
    expect(screen.getByText("End Shift")).toBeInTheDocument();
  });

  it("renders the Active Loads count as 0 when all loads are delivered", async () => {
    const driverData = { id: "d1", full_name: "Done Driver", hub: "la", status: "active" };
    const loadData = [
      { id: "load1", reference_number: "ANK-002", client_name: "Delivered Client", status: "delivered", packages: 2, service_type: "courier", pickup_address: "100 A St", delivery_address: "200 B Ave", start_time: null, end_time: null, wait_time_minutes: null, comments: null },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "drivers") {
        return makeQb({ data: driverData, error: null });
      }
      if (table === "driver_shifts") {
        return makeQb({ data: null, error: { code: "PGRST116", message: "no rows" } });
      }
      if (table === "daily_loads") {
        return makeQb({ data: loadData, error: null });
      }
      return makeQb({ data: [], error: null });
    });

    render(<DriverPortal />);
    expect(await screen.findByText("Done Driver")).toBeInTheDocument();
    // Active loads should be 0 since only delivered loads exist
    expect(screen.getByText(/Active Loads \(0\)/)).toBeInTheDocument();
  });
});
