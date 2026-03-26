import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserRole } from "./useUserRole";

vi.mock("@/integrations/supabase/client", () => {
    const mockFrom = vi.fn();
    return { supabase: { from: mockFrom } };
});

vi.mock("./useAuth", () => ({
    useAuth: vi.fn(),
}));

const { supabase } = await import("@/integrations/supabase/client");
const { useAuth } = await import("./useAuth");

function makeQueryBuilder(data: unknown, error: unknown = null) {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useUserRole", () => {
    it("returns loading=true while auth is loading", () => {
        vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as never);

        const { result } = renderHook(() => useUserRole());

        expect(result.current.loading).toBe(true);
        expect(result.current.role).toBe(null);
    });

    it("sets role=null and loading=false when no user", async () => {
        vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.role).toBe(null);
        expect(result.current.isOwner).toBe(false);
    });

    it("fetches role from supabase when user is present", async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: "user-1" }, loading: false } as never);
        const qb = makeQueryBuilder({ role: "owner" });
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.role).toBe("owner");
        expect(result.current.isOwner).toBe(true);
    });

    it("sets role=dispatcher and isOwner=false for dispatcher role", async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: "user-2" }, loading: false } as never);
        const qb = makeQueryBuilder({ role: "dispatcher" });
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.role).toBe("dispatcher");
        expect(result.current.isOwner).toBe(false);
    });

    it("sets role=null when supabase returns no data", async () => {
        vi.mocked(useAuth).mockReturnValue({ user: { id: "user-3" }, loading: false } as never);
        const qb = makeQueryBuilder(null);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useUserRole());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.role).toBe(null);
        expect(result.current.isOwner).toBe(false);
    });
});
