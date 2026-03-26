import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "http://example.com/file" } })),
      })),
    },
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
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import PodManager from "./PodManager";

describe("PodManager", () => {
  it("renders without crashing", () => {
    const { container } = render(<PodManager />);
    expect(container).toBeTruthy();
  });

  it("renders the POD Manager heading", async () => {
    render(<PodManager />);
    expect(await screen.findByText("POD Manager")).toBeInTheDocument();
  });

  it("renders the description text", async () => {
    render(<PodManager />);
    expect(await screen.findByText(/Upload load documents/)).toBeInTheDocument();
  });
});
