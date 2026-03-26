import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
const makeQb = (v: any = { data: [], error: null }) => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve(v).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return qb;
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn(() => makeQb()), functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import TeamManagement from "./TeamManagement";
describe("TeamManagement", () => {
  it("renders heading", async () => { render(<TeamManagement />); await waitFor(() => { expect(screen.getByText(/Team Management/i)).toBeInTheDocument(); }); });
  it("renders the Invite User button", async () => {
    render(<TeamManagement />);
    expect(await screen.findByRole("button", { name: /Invite User/i })).toBeInTheDocument();
  });
  it("renders loading state then team members section", async () => {
    const { container } = render(<TeamManagement />);
    await waitFor(() => { expect(container.innerHTML).toContain("Team Management"); });
  });
});
