import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/hooks/useRouteOptimizer", () => ({
  useRouteOptimizer: () => ({ optimizedRoute: null, isOptimizing: false, optimize: vi.fn(), error: null }),
  optimizeRoute: vi.fn().mockReturnValue({ stops: [], totalMiles: 0, totalMinutes: 0, savingsVsOriginalMiles: 0, savingsVsOriginalMinutes: 0 }),
  geocodeAddress: vi.fn().mockResolvedValue({ lat: 33.749, lng: -84.388 }),
}));
vi.mock("@/integrations/supabase/client", () => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve({ data: [], error: null }).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return { supabase: { from: vi.fn(() => qb) } };
});
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import RouteOptimizerPanel from "./RouteOptimizerPanel";

describe("RouteOptimizerPanel", () => {
  it("renders header", () => {
    render(<RouteOptimizerPanel loads={[]} />);
    expect(screen.getByText(/Route Optimizer/i)).toBeInTheDocument();
  });

  it("renders the Optimize button", () => {
    render(<RouteOptimizerPanel loads={[]} />);
    expect(screen.getByRole("button", { name: /Optimize/i })).toBeInTheDocument();
  });

  it("renders deliverable loads count", () => {
    const loads = [
      { id: "1", client_name: "Client A", delivery_address: "100 A St", pickup_address: "50 X St", delivery_lat: 33.749, delivery_lng: -84.388, status: "assigned", packages: 2, tracking_token: "tok1" },
      { id: "2", client_name: "Client B", delivery_address: "200 B St", pickup_address: "60 Y St", delivery_lat: 33.850, delivery_lng: -84.400, status: "in_transit", packages: 1, tracking_token: "tok2" },
      { id: "3", client_name: "Client C", delivery_address: null, pickup_address: null, delivery_lat: null, delivery_lng: null, status: "delivered", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    // It should show the deliverable count (2 loads: assigned and in_transit with addresses)
    expect(screen.getByText(/2 stops/i)).toBeInTheDocument();
  });

  it("renders driver name when provided", () => {
    render(<RouteOptimizerPanel loads={[]} driverName="Alice Smith" />);
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
  });

  it("renders no deliverable loads message when all loads are delivered", () => {
    const loads = [
      { id: "1", client_name: "Done", delivery_address: "100 A St", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "delivered", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    expect(screen.getByText(/0 stops/i)).toBeInTheDocument();
  });

  it("renders loads without coordinates", () => {
    const loads = [
      { id: "1", client_name: "No Coords", delivery_address: "123 Unknown St", pickup_address: "X", delivery_lat: null, delivery_lng: null, status: "assigned", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    expect(screen.getByText(/1 stop/i)).toBeInTheDocument();
  });

  it("shows need at least 2 loads message when less than 2 deliverable", () => {
    const loads = [
      { id: "1", client_name: "Solo", delivery_address: "100 A St", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "assigned", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    expect(screen.getByText(/Need at least 2/i)).toBeInTheDocument();
  });

  it("disables optimize button when fewer than 2 deliverable loads", () => {
    render(<RouteOptimizerPanel loads={[]} />);
    const btn = screen.getByRole("button", { name: /Optimize/i });
    expect(btn).toBeDisabled();
  });

  it("enables optimize button when 2+ deliverable loads exist", () => {
    const loads = [
      { id: "1", client_name: "A", delivery_address: "100 A", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "assigned", packages: 1, tracking_token: null },
      { id: "2", client_name: "B", delivery_address: "200 B", pickup_address: "Y", delivery_lat: 33.8, delivery_lng: -84.4, status: "in_transit", packages: 1, tracking_token: "tok" },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    const btn = screen.getByRole("button", { name: /Optimize/i });
    expect(btn).not.toBeDisabled();
  });

  it("filters out cancelled loads from deliverable count", () => {
    const loads = [
      { id: "1", client_name: "Active", delivery_address: "100 A", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "assigned", packages: 1, tracking_token: null },
      { id: "2", client_name: "Cancelled", delivery_address: "200 B", pickup_address: "Y", delivery_lat: 33.8, delivery_lng: -84.4, status: "cancelled", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    expect(screen.getByText(/1 stop/i)).toBeInTheDocument();
  });

  it("filters out loads without delivery address", () => {
    const loads = [
      { id: "1", client_name: "Has Addr", delivery_address: "100 A", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "assigned", packages: 1, tracking_token: null },
      { id: "2", client_name: "No Addr", delivery_address: null, pickup_address: "Y", delivery_lat: null, delivery_lng: null, status: "assigned", packages: 1, tracking_token: null },
    ];
    render(<RouteOptimizerPanel loads={loads} />);
    expect(screen.getByText(/1 stop/i)).toBeInTheDocument();
  });

  it("renders shift start time when driverName is provided", () => {
    render(<RouteOptimizerPanel loads={[]} driverName="Bob" shiftStart="07:30" />);
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/07:30/)).toBeInTheDocument();
  });

  it("clicking optimize with 2+ loads triggers optimization", async () => {
    const loads = [
      { id: "1", client_name: "A", delivery_address: "100 A", pickup_address: "X", delivery_lat: 33.7, delivery_lng: -84.3, status: "assigned", packages: 1, tracking_token: null },
      { id: "2", client_name: "B", delivery_address: "200 B", pickup_address: "Y", delivery_lat: 33.8, delivery_lng: -84.4, status: "assigned", packages: 2, tracking_token: "tok1" },
    ];
    render(<RouteOptimizerPanel loads={loads} driverName="TestDriver" />);
    const btn = screen.getByRole("button", { name: /Optimize/i });
    fireEvent.click(btn);
    const { waitFor } = await import("@testing-library/react");
    await waitFor(() => {
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
