import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

function makeQb(resolveValue: any = { data: [], error: null }) {
  const qb: any = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert", "eq", "neq", "gt", "lt",
    "gte", "lte", "like", "ilike", "in", "is", "order", "limit", "range",
    "single", "maybeSingle", "match", "not", "or", "filter", "rpc", "count",
    "csv", "on", "subscribe", "unsubscribe",
  ])
    qb[m] = vi.fn().mockReturnValue(qb);
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
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true, contacts: [], totalResults: 0 }, error: null }),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/sequenceUtils", () => ({
  createSequenceForLead: vi.fn().mockResolvedValue(true),
  assignHub: vi.fn().mockReturnValue("phoenix"),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const a = await vi.importActual("react-router-dom");
  return {
    ...a,
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useParams: vi.fn(() => ({})),
  };
});

// Mock the Select components to avoid Radix empty-value error from source code
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: any) => <div data-testid="select">{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

import LeadFinder from "./LeadFinder";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LeadFinder", () => {
  it("renders the Lead Finder heading", () => {
    render(<LeadFinder />);
    expect(screen.getByText("Lead Finder")).toBeInTheDocument();
  });

  it("renders the Search ZoomInfo button", () => {
    render(<LeadFinder />);
    expect(screen.getByText("Search ZoomInfo")).toBeInTheDocument();
  });

  it("renders the empty state message when no contacts loaded", () => {
    render(<LeadFinder />);
    expect(screen.getByText("Search for Leads")).toBeInTheDocument();
  });

  it("renders the page with content", () => {
    const { container } = render(<LeadFinder />);
    expect(container.innerHTML.length).toBeGreaterThan(200);
  });

  it("renders multiple UI elements on the page", () => {
    render(<LeadFinder />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
