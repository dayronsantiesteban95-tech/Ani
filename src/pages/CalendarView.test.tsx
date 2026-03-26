import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

function makeQb(resolveValue = { data: [], error: null }) {
  const qb: any = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq", "gt", "lt",
    "gte", "lte", "like", "ilike", "in", "order", "limit", "range",
    "single", "maybeSingle", "match", "not", "or", "filter", "rpc",
    "upsert", "count", "head", "csv", "on", "subscribe",
  ];
  for (const m of methods) qb[m] = vi.fn().mockReturnValue(qb);
  // Use async resolution to avoid potential synchronous render loops
  qb.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return qb;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQb()),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isOwner: true, role: "owner", loading: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import CalendarView from "./CalendarView";

describe("CalendarView", () => {
  it("renders the Calendar heading", async () => {
    render(<CalendarView />);
    expect(await screen.findByText("Calendar")).toBeInTheDocument();
  });

  it("renders the Today button", async () => {
    render(<CalendarView />);
    expect(await screen.findByText("Today")).toBeInTheDocument();
  });

  it("renders Month and Week view toggle buttons", async () => {
    render(<CalendarView />);
    expect(await screen.findByText("Month")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
  });
});
