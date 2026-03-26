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
});
