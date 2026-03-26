import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SopWiki from "./SopWiki";

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
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

describe("SopWiki", () => {
  it("renders the SOP Wiki heading", async () => {
    render(<SopWiki />);
    expect(await screen.findByText("SOP Wiki")).toBeInTheDocument();
  });

  it("renders the New Article button", async () => {
    render(<SopWiki />);
    expect(await screen.findByRole("button", { name: /new article/i })).toBeInTheDocument();
  });

  it("shows empty state text when no articles exist", async () => {
    render(<SopWiki />);
    expect(
      await screen.findByText(/no articles found/i),
    ).toBeInTheDocument();
  });
});
