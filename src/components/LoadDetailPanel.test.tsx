import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve({ data: [], error: null }).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return { supabase: { from: vi.fn(() => qb), channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })), removeChannel: vi.fn() } };
});
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import LoadDetailPanel from "./LoadDetailPanel";
describe("LoadDetailPanel", () => {
  it("renders reference number", () => {
    const load = { id: "1", reference_number: "ANK-001", client_name: "Test", status: "pending" };
    render(<LoadDetailPanel load={load} open={true} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText("ANK-001")).toBeInTheDocument();
  });

  it("renders client name when provided", () => {
    const load = { id: "1", reference_number: "ANK-002", client_name: "Acme Corp", status: "assigned" };
    render(<LoadDetailPanel load={load} open={true} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the status badge for the load", () => {
    const load = { id: "1", reference_number: "ANK-003", client_name: "Test", status: "pending", revenue: 500, driver_pay: 200, fuel_cost: 50 };
    render(<LoadDetailPanel load={load} open={true} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
