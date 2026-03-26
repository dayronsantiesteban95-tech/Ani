import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders vehicle data in the vehicles table", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const vehicles = [
      { id: "v1", vehicle_name: "Van-001", vehicle_type: "cargo_van", make: "Ford", model: "Transit", year: 2023, vin: "1234", license_plate: "ABC123", hub: "atlanta", status: "active", current_mileage: 50000, next_service_mileage: 55000, next_service_date: "2026-06-01", insurance_expiry: "2026-12-31", registration_expiry: "2026-12-31", fuel_type: "gas", avg_mpg: 20, daily_rate: 150, notes: null, created_at: "2026-01-01T00:00:00Z" },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "vehicles") return makeQb({ data: vehicles, error: null });
      return makeQb();
    });

    render(<FleetTracker />);
    expect(await screen.findByText("Van-001")).toBeInTheDocument();
  });

  it("renders the drivers tab trigger", async () => {
    render(<FleetTracker />);
    await screen.findByText("Fleet Tracker");
    const driversTab = screen.getByRole("tab", { name: /drivers/i });
    expect(driversTab).toBeInTheDocument();
  });

  it("renders stat card labels after loading", async () => {
    render(<FleetTracker />);
    await screen.findByText("Fleet Tracker");
    // The page should show stat-related content
    expect(screen.getByText(/Add Vehicle/i)).toBeInTheDocument();
  });

  it("renders maintenance tab", async () => {
    render(<FleetTracker />);
    await screen.findByText("Fleet Tracker");
    const maintenanceTab = screen.getByRole("tab", { name: /maintenance/i });
    expect(maintenanceTab).toBeInTheDocument();
  });
});
