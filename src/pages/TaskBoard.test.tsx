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

import TaskBoard from "./TaskBoard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TaskBoard", () => {
  it("renders the Task Board heading after loading", async () => {
    render(<TaskBoard />);
    const heading = await screen.findByText("Task Board", {}, { timeout: 3000 });
    expect(heading).toBeInTheDocument();
  });

  it("renders the New Task button", async () => {
    render(<TaskBoard />);
    const btn = await screen.findByRole("button", { name: /New Task/i }, { timeout: 3000 });
    expect(btn).toBeInTheDocument();
  });

  it("renders the search input", async () => {
    render(<TaskBoard />);
    const input = await screen.findByPlaceholderText("Search tasks...", {}, { timeout: 3000 });
    expect(input).toBeInTheDocument();
  });

  it("renders all three column headers: To Do, In Progress, Done", async () => {
    render(<TaskBoard />);
    const columns = ["To Do", "In Progress", "Done"];
    for (const col of columns) {
      const el = await screen.findByText(col, {}, { timeout: 3000 });
      expect(el).toBeInTheDocument();
    }
  });

  it("renders the All department filter button", async () => {
    render(<TaskBoard />);
    const allBtn = await screen.findByRole("button", { name: "All" }, { timeout: 3000 });
    expect(allBtn).toBeInTheDocument();
  });

  it("renders department filter buttons", async () => {
    render(<TaskBoard />);
    const departments = ["Onboarding", "Marketing/Growth", "Operations", "Fleet/Courier Mgt", "Finance"];
    for (const dept of departments) {
      const el = await screen.findByRole("button", { name: dept }, { timeout: 3000 });
      expect(el).toBeInTheDocument();
    }
  });

  it("renders the owner subtitle when isOwner is true", async () => {
    render(<TaskBoard />);
    const subtitle = await screen.findByText("All team tasks", {}, { timeout: 3000 });
    expect(subtitle).toBeInTheDocument();
  });

  it("shows empty state message in columns when there are no tasks", async () => {
    render(<TaskBoard />);
    const emptyMessages = await screen.findAllByText("No tasks here yet", {}, { timeout: 3000 });
    // Should show in all 3 columns
    expect(emptyMessages.length).toBe(3);
  });

  it("renders tasks in the correct columns when data is provided", async () => {
    const tasks = [
      { id: "t1", title: "Plan onboarding", description: "Plan new client", status: "todo", priority: "high", assigned_to: "u1", due_date: "2026-04-01", department: "onboarding", created_by: "u1", created_at: "2026-03-20T10:00:00Z" },
      { id: "t2", title: "Send proposal", description: null, status: "in_progress", priority: "medium", assigned_to: "u1", due_date: null, department: "marketing_growth", created_by: "u1", created_at: "2026-03-19T10:00:00Z" },
      { id: "t3", title: "Review contract", description: null, status: "done", priority: "low", assigned_to: "u1", due_date: "2026-03-25", department: "finance", created_by: "u1", created_at: "2026-03-18T10:00:00Z" },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "tasks") return makeQb({ data: tasks, error: null });
      if (table === "task_lead_links") return makeQb({ data: [], error: null });
      if (table === "profiles") return makeQb({ data: [{ user_id: "u1", full_name: "Test User" }], error: null });
      if (table === "leads") return makeQb({ data: [], error: null });
      return makeQb();
    });

    render(<TaskBoard />);
    expect(await screen.findByText("Plan onboarding", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("Send proposal")).toBeInTheDocument();
    expect(screen.getByText("Review contract")).toBeInTheDocument();
  });

  it("renders task priority badges", async () => {
    const tasks = [
      { id: "t1", title: "Urgent task", description: null, status: "todo", priority: "critical", assigned_to: "u1", due_date: null, department: null, created_by: "u1", created_at: "2026-03-20T10:00:00Z" },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "tasks") return makeQb({ data: tasks, error: null });
      if (table === "task_lead_links") return makeQb({ data: [], error: null });
      if (table === "profiles") return makeQb({ data: [], error: null });
      if (table === "leads") return makeQb({ data: [], error: null });
      return makeQb();
    });

    render(<TaskBoard />);
    expect(await screen.findByText("Urgent task", {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it("renders search filtering of tasks", async () => {
    const tasks = [
      { id: "t1", title: "Matching task", description: null, status: "todo", priority: "medium", assigned_to: "u1", due_date: null, department: null, created_by: "u1", created_at: "2026-03-20T10:00:00Z" },
      { id: "t2", title: "Hidden task", description: null, status: "todo", priority: "low", assigned_to: "u1", due_date: null, department: null, created_by: "u1", created_at: "2026-03-19T10:00:00Z" },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "tasks") return makeQb({ data: tasks, error: null });
      if (table === "task_lead_links") return makeQb({ data: [], error: null });
      if (table === "profiles") return makeQb({ data: [], error: null });
      if (table === "leads") return makeQb({ data: [], error: null });
      return makeQb();
    });

    render(<TaskBoard />);
    await screen.findByText("Matching task", {}, { timeout: 3000 });
    const searchInput = screen.getByPlaceholderText("Search tasks...");
    fireEvent.change(searchInput, { target: { value: "Matching" } });
    expect(screen.getByText("Matching task")).toBeInTheDocument();
    expect(screen.queryByText("Hidden task")).not.toBeInTheDocument();
  });

  it("renders tasks with due dates", async () => {
    const tasks = [
      { id: "t1", title: "Due task", description: "Has a due date", status: "todo", priority: "high", assigned_to: "u1", due_date: "2026-04-01", department: "operations", created_by: "u1", created_at: "2026-03-20T10:00:00Z" },
    ];

    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "tasks") return makeQb({ data: tasks, error: null });
      if (table === "task_lead_links") return makeQb({ data: [], error: null });
      if (table === "profiles") return makeQb({ data: [{ user_id: "u1", full_name: "Tester" }], error: null });
      if (table === "leads") return makeQb({ data: [], error: null });
      return makeQb();
    });

    render(<TaskBoard />);
    expect(await screen.findByText("Due task", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
