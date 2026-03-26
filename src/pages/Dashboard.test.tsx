import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a chainable query builder where every method returns itself,
// and the object is thenable (has .then) so `await` resolves to { data, error, count }.
function makeQb(resolveValue = { data: [], error: null, count: 0 }) {
  const qb: Record<string, any> = {};
  const methods = [
    "select", "eq", "neq", "lt", "not", "order", "limit",
    "insert", "update", "delete", "single", "from",
  ];
  for (const m of methods) {
    qb[m] = vi.fn(() => qb);
  }
  // Make the object thenable so `await` resolves
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
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" } }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isOwner: true }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
}));

vi.mock("@/components/AiChatbot", () => ({
  default: () => <div data-testid="ai-chatbot" />,
}));

import Dashboard from "./Dashboard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard", () => {
  it("renders the loading skeleton initially", () => {
    render(<Dashboard />);
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the Dashboard heading after data loads", async () => {
    render(<Dashboard />);
    const heading = await screen.findByText("Dashboard", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the welcome message after data loads", async () => {
    render(<Dashboard />);
    const welcome = await screen.findByText("Welcome to Anika Operations", {}, { timeout: 3000 });
    expect(welcome).toBeInTheDocument();
  });

  it("renders all six stat card labels after loading", async () => {
    render(<Dashboard />);
    const labels = ["Active Leads", "Tasks Due Today", "Overdue Follow-ups", "Accounts Won", "Companies", "Contacts"];
    for (const label of labels) {
      const el = await screen.findByText(label, {}, { timeout: 3000 });
      expect(el).toBeInTheDocument();
    }
  });

  it("renders Pipeline Funnel card header", async () => {
    render(<Dashboard />);
    const heading = await screen.findByText("Pipeline Funnel", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders Recent Activity card header", async () => {
    render(<Dashboard />);
    const heading = await screen.findByText("Recent Activity", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders My Tasks card header", async () => {
    render(<Dashboard />);
    const heading = await screen.findByText("My Tasks", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the AI chatbot component", async () => {
    render(<Dashboard />);
    const chatbot = await screen.findByTestId("ai-chatbot", {}, { timeout: 3000 });
    expect(chatbot).toBeInTheDocument();
  });

  it("renders dashboard with data in stat cards", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const leads = [
      { id: "l1", company_name: "Dashboard Lead", stage: "new_lead", created_at: "2026-03-25T00:00:00Z" },
    ];
    const tasks = [
      { id: "t1", title: "Dashboard Task", status: "todo", due_date: "2026-03-25", priority: "high", assigned_to: "u1", created_at: "2026-03-25T00:00:00Z" },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "leads") return makeQb({ data: leads, error: null });
      if (table === "tasks") return makeQb({ data: tasks, error: null });
      return makeQb();
    });

    render(<Dashboard />);
    await screen.findByText("Dashboard", {}, { timeout: 3000 });
    expect(screen.getByText("Active Leads")).toBeInTheDocument();
  });

  it("renders the page with substantial content", async () => {
    const { container } = render(<Dashboard />);
    await screen.findByText("Dashboard", {}, { timeout: 3000 });
    expect(container.innerHTML.length).toBeGreaterThan(500);
  });
});
