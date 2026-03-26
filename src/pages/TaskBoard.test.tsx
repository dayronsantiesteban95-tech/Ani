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
});
