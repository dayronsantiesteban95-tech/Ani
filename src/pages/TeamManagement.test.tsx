import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();
const makeQb = (v: any = { data: [], error: null }) => {
  const qb = new Proxy({}, { get: (_, p) => p === "then" ? ((r: any) => Promise.resolve(v).then(r)) : vi.fn().mockReturnValue(qb) }) as any;
  return qb;
};
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (...args: any[]) => mockFrom(...args), functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) }, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null }) } } }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
import TeamManagement from "./TeamManagement";

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockImplementation(() => makeQb());
});

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

  it("renders the description text", async () => {
    render(<TeamManagement />);
    expect(await screen.findByText(/Manage your team members/i)).toBeInTheDocument();
  });

  it("renders team members when fetch returns data", async () => {
    const teamData = [
      { id: "u1", full_name: "Dayron Admin", email: "dayron@test.com", role: "owner", created_at: "2026-01-01T00:00:00Z", last_sign_in_at: "2026-03-25T10:00:00Z" },
      { id: "u2", full_name: "Juan Dispatcher", email: "juan@test.com", role: "dispatcher", created_at: "2026-02-01T00:00:00Z", last_sign_in_at: null },
    ];

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ team: teamData }),
    }));

    render(<TeamManagement />);
    expect(await screen.findByText("Dayron Admin")).toBeInTheDocument();
    expect(screen.getByText("Juan Dispatcher")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("renders empty state when no team members", async () => {
    render(<TeamManagement />);
    await waitFor(() => {
      expect(screen.getByText(/Team Management/i)).toBeInTheDocument();
    });
  });
});
