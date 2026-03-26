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
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }),
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// useParams returns no token so the component shows the empty/search state
vi.mock("react-router-dom", async () => {
  const a = await vi.importActual("react-router-dom");
  return {
    ...a,
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
    useParams: vi.fn(() => ({})),
  };
});

import TrackDelivery from "./TrackDelivery";

beforeEach(() => {
  vi.clearAllMocks();
});

const { supabase } = await import("@/integrations/supabase/client");

describe("TrackDelivery", () => {
  it("renders the Track Your Delivery heading", () => {
    render(<TrackDelivery />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Track Your Delivery" })
    ).toBeInTheDocument();
  });

  it("renders the Track button", () => {
    render(<TrackDelivery />);
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("renders the empty state prompt when no tracking number provided", () => {
    render(<TrackDelivery />);
    expect(
      screen.getByText("Enter your tracking number above to get started")
    ).toBeInTheDocument();
  });

  it("renders the search input with ANK-XXXXXX placeholder", () => {
    render(<TrackDelivery />);
    expect(screen.getByPlaceholderText("ANK-XXXXXX")).toBeInTheDocument();
  });

  it("renders the format hint text", () => {
    render(<TrackDelivery />);
    expect(screen.getByText("Format: ANK-XXXXXX")).toBeInTheDocument();
  });
});
