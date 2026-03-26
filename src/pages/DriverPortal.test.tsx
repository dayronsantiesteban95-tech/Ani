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
});
