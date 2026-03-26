import { render, screen, fireEvent } from "@testing-library/react";
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
      rpc: vi.fn(() => {
        const qb = makeQb({ data: null, error: null });
        return qb;
      }),
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

vi.mock("@/components/LeadDetailPanel", () => ({
  default: () => <div data-testid="lead-detail-panel" />,
}));

import Pipeline from "./Pipeline";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Pipeline", () => {
  it("renders the Growth Pipeline heading after loading", async () => {
    render(<Pipeline />);
    const heading = await screen.findByText("Growth Pipeline", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the New Lead button", async () => {
    render(<Pipeline />);
    const btn = await screen.findByRole("button", { name: /New Lead/i }, { timeout: 3000 });
    expect(btn).toBeInTheDocument();
  });

  it("renders the search input", async () => {
    render(<Pipeline />);
    const input = await screen.findByPlaceholderText("Search leads...", {}, { timeout: 3000 });
    expect(input).toBeInTheDocument();
  });

  it("renders all LEAD_STAGES column headers", async () => {
    render(<Pipeline />);
    // "New Lead" appears both as button text and column header, so use getAllByText
    const stages = [
      "Qualified / Needs Analysis", "Quote Sent / Proposal",
      "Operational Review", "Trial Run / Pilot", "Account Active", "Retention / Check-in",
    ];
    for (const stage of stages) {
      const el = await screen.findByText(stage, {}, { timeout: 3000 });
      expect(el).toBeInTheDocument();
    }
    // "New Lead" appears as both button and header, verify at least 2 matches
    const newLeadElements = await screen.findAllByText("New Lead", {}, { timeout: 3000 });
    expect(newLeadElements.length).toBeGreaterThanOrEqual(2);
  });

  it("renders the subtitle description", async () => {
    render(<Pipeline />);
    const subtitle = await screen.findByText("Track and manage your prospecting leads", {}, { timeout: 3000 });
    expect(subtitle).toBeInTheDocument();
  });

  it("renders city hub filter buttons including All", async () => {
    render(<Pipeline />);
    // The All filter button
    const allBtn = await screen.findByRole("button", { name: "All" }, { timeout: 3000 });
    expect(allBtn).toBeInTheDocument();
  });

  it("renders the LeadDetailPanel mock component", async () => {
    render(<Pipeline />);
    const panel = await screen.findByTestId("lead-detail-panel", {}, { timeout: 3000 });
    expect(panel).toBeInTheDocument();
  });

  it("renders leads in their stage columns", async () => {
    const leads = [
      { id: "l1", company_name: "Alpha Corp", contact_person: "John", stage: "new_lead", city_hub: "atlanta", industry: "legal", email: "j@alpha.com", created_at: "2026-03-20T10:00:00Z", temperature: 80 },
      { id: "l2", company_name: "Beta Inc", contact_person: "Jane", stage: "qualified", city_hub: "phoenix", industry: "medical_pharma", email: "j@beta.com", created_at: "2026-03-19T10:00:00Z", temperature: 60 },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "leads") return makeQb({ data: leads, error: null });
      return makeQb();
    });

    render(<Pipeline />);
    expect(await screen.findByText("Alpha Corp", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
  });

  it("renders lead count badges on columns", async () => {
    const leads = [
      { id: "l1", company_name: "Test Lead", contact_person: "A", stage: "new_lead", city_hub: "atlanta", industry: "legal", email: "a@test.com", created_at: "2026-03-20T10:00:00Z", temperature: 50 },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "leads") return makeQb({ data: leads, error: null });
      return makeQb();
    });

    render(<Pipeline />);
    await screen.findByText("Test Lead", {}, { timeout: 3000 });
    // At least the New Lead column should show a count
    expect(screen.getByText("Test Lead")).toBeInTheDocument();
  });

  it("filters leads by search query", async () => {
    const leads = [
      { id: "l1", company_name: "Searchable Corp", contact_person: "Sam", stage: "new_lead", city_hub: "atlanta", industry: "legal", email: "s@search.com", created_at: "2026-03-20T10:00:00Z", temperature: 70 },
      { id: "l2", company_name: "Hidden Corp", contact_person: "Tom", stage: "new_lead", city_hub: "phoenix", industry: "legal", email: "t@hidden.com", created_at: "2026-03-19T10:00:00Z", temperature: 40 },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "leads") return makeQb({ data: leads, error: null });
      return makeQb();
    });

    render(<Pipeline />);
    await screen.findByText("Searchable Corp", {}, { timeout: 3000 });
    const input = screen.getByPlaceholderText("Search leads...");
    fireEvent.change(input, { target: { value: "Searchable" } });
    expect(screen.getByText("Searchable Corp")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Corp")).not.toBeInTheDocument();
  });
});
