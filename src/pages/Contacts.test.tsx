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

import Contacts from "./Contacts";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Contacts", () => {
  it("renders the Contacts heading", async () => {
    render(<Contacts />);
    const heading = await screen.findByText("Contacts", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the Add Contact button", async () => {
    render(<Contacts />);
    const btn = await screen.findByRole("button", { name: /Add Contact/i }, { timeout: 3000 });
    expect(btn).toBeInTheDocument();
  });

  it("renders the search input", async () => {
    render(<Contacts />);
    const input = await screen.findByPlaceholderText("Search contacts...", {}, { timeout: 3000 });
    expect(input).toBeInTheDocument();
  });

  it("renders the subtitle description", async () => {
    render(<Contacts />);
    const subtitle = await screen.findByText(/Manage your contact/i, {}, { timeout: 3000 });
    expect(subtitle).toBeInTheDocument();
  });

  it("renders empty state when no contacts loaded", async () => {
    render(<Contacts />);
    const emptyText = await screen.findByText(/no contacts/i, {}, { timeout: 3000 });
    expect(emptyText).toBeInTheDocument();
  });

  it("renders contacts when data is provided", async () => {
    const contacts = [
      { id: "ct1", first_name: "John", last_name: "Smith", email: "john@test.com", phone: "555-1234", company_id: "c1", job_title: "Manager", notes: null, created_at: "2026-01-01T00:00:00Z" },
      { id: "ct2", first_name: "Jane", last_name: "Doe", email: "jane@test.com", phone: null, company_id: null, job_title: null, notes: null, created_at: "2026-02-01T00:00:00Z" },
    ];
    const companies = [
      { id: "c1", name: "Acme Corp" },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "contacts") return makeQb({ data: contacts, error: null });
      if (table === "companies") return makeQb({ data: companies, error: null });
      return makeQb();
    });

    render(<Contacts />);
    expect(await screen.findByText(/John/, {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
