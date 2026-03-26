import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

function makeQb(resolveValue = { data: [], error: null, count: 0 }) {
  const qb: Record<string, any> = {};
  const methods = [
    "select", "eq", "neq", "lt", "not", "order", "limit",
    "insert", "update", "delete", "single", "from",
  ];
  for (const m of methods) {
    qb[m] = vi.fn(() => qb);
  }
  qb.then = (resolve: any) => resolve(resolveValue);
  return qb;
}

vi.mock("@/integrations/supabase/client", () => {
  const channelObj = { on: vi.fn().mockReturnThis(), subscribe: vi.fn() };
  return {
    supabase: {
      from: vi.fn(() => makeQb()),
      channel: vi.fn(() => channelObj),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" } }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

import Companies from "./Companies";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Companies", () => {
  it("renders the Companies heading", async () => {
    render(<Companies />);
    const heading = await screen.findByText("Companies", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the Add Company button", async () => {
    render(<Companies />);
    const btn = await screen.findByRole("button", { name: /Add Company/i }, { timeout: 3000 });
    expect(btn).toBeInTheDocument();
  });

  it("renders the search input", async () => {
    render(<Companies />);
    const input = await screen.findByPlaceholderText("Search companies...", {}, { timeout: 3000 });
    expect(input).toBeInTheDocument();
  });

  it("renders the subtitle description", async () => {
    render(<Companies />);
    const subtitle = await screen.findByText(/Manage your company database/i, {}, { timeout: 3000 });
    expect(subtitle).toBeInTheDocument();
  });

  it("renders the table with no companies found", async () => {
    render(<Companies />);
    const emptyText = await screen.findByText(/No companies found/i, {}, { timeout: 3000 });
    expect(emptyText).toBeInTheDocument();
  });

  it("renders companies when data is provided", async () => {
    const companies = [
      { id: "c1", name: "Test Corp", industry: "legal", city: "Atlanta", state: "GA", hub: "atlanta", website: "https://test.com", notes: null, created_at: "2026-01-01T00:00:00Z", lead_count: 3 },
      { id: "c2", name: "Another Inc", industry: "medical_pharma", city: "Phoenix", state: "AZ", hub: "phoenix", website: null, notes: "Good company", created_at: "2026-02-01T00:00:00Z", lead_count: 0 },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "companies") return makeQb({ data: companies, error: null });
      return makeQb();
    });

    render(<Companies />);
    expect(await screen.findByText("Test Corp", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Another Inc")).toBeInTheDocument();
  });

  it("renders search filtering", async () => {
    const companies = [
      { id: "c1", name: "Findable Corp", industry: "legal", city: "Atlanta", state: "GA", hub: "atlanta", website: null, notes: null, created_at: "2026-01-01T00:00:00Z", lead_count: 1 },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "companies") return makeQb({ data: companies, error: null });
      return makeQb();
    });

    render(<Companies />);
    await screen.findByText("Findable Corp", {}, { timeout: 3000 });
    const input = screen.getByPlaceholderText("Search companies...");
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "Findable" } });
    expect(screen.getByText("Findable Corp")).toBeInTheDocument();
  });
});
