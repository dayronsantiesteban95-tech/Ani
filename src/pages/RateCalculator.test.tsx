import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RateCalculator from "./RateCalculator";

function makeQb(resolveValue: any = { data: [], error: null }) {
  const qb: any = {};
  for (const m of ['select','insert','update','delete','upsert','eq','neq','gt','lt','gte','lte','like','ilike','in','is','order','limit','range','single','maybeSingle','match','not','or','filter','rpc','count','csv','on','subscribe','unsubscribe']) qb[m] = vi.fn().mockReturnValue(qb);
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
  },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1", email: "t@t.com" }, loading: false }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "owner", isOwner: true, isAdmin: true, loading: false }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/components/MarketComparison", () => ({ default: () => <div data-testid="market-comparison" /> }));

describe("RateCalculator", () => {
  it("renders the Rate Calculator heading", async () => {
    render(<RateCalculator />);
    expect(await screen.findByText("Rate Calculator")).toBeInTheDocument();
  });

  it("shows the rate_cards empty error message when no rate cards exist", async () => {
    render(<RateCalculator />);
    expect(
      await screen.findByText(/rate_cards table is empty/i),
    ).toBeInTheDocument();
  });

  it("renders the Retry button on error state", async () => {
    render(<RateCalculator />);
    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
