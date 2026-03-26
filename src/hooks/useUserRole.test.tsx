import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserRole } from "./useUserRole";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
  },
}));

vi.mock("./useAuth");

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const mockUseAuth = vi.mocked(useAuth);
const mockFrom = vi.mocked(supabase.from);

function buildQueryChain(resolvedData: { data: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedData),
  };
  mockFrom.mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useUserRole", () => {
  it("returns loading=true and role=null while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    buildQueryChain({ data: null });

    const { result } = renderHook(() => useUserRole());

    expect(result.current.loading).toBe(true);
    expect(result.current.role).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });

  it("returns role=null and loading=false when there is no user", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    buildQueryChain({ data: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });

  it("returns role='owner' and isOwner=true for an owner user", async () => {
    const fakeUser = { id: "user-1" } as import("@supabase/supabase-js").User;
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    buildQueryChain({ data: { role: "owner" } });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("owner");
    expect(result.current.isOwner).toBe(true);
  });

  it("returns role='dispatcher' and isOwner=false for a dispatcher user", async () => {
    const fakeUser = { id: "user-2" } as import("@supabase/supabase-js").User;
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    buildQueryChain({ data: { role: "dispatcher" } });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("dispatcher");
    expect(result.current.isOwner).toBe(false);
  });

  it("returns role=null when user has no role row in user_roles", async () => {
    const fakeUser = { id: "user-3" } as import("@supabase/supabase-js").User;
    mockUseAuth.mockReturnValue({ user: fakeUser, loading: false });
    buildQueryChain({ data: null });

    const { result } = renderHook(() => useUserRole());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });
});
