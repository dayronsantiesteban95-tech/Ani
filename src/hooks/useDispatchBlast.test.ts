import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDispatchBlast } from "./useDispatchBlast";

// ─── Mock dependencies ─────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
        channel: vi.fn(),
        removeChannel: vi.fn(),
        rpc: vi.fn(),
    },
}));

vi.mock("@/hooks/useAuth", () => ({
    useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: vi.fn(),
}));

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ─── Helpers ───────────────────────────────────────────

const mockToast = vi.fn();

const makeBlast = (overrides = {}) => ({
    id: "blast-1",
    load_id: "load-1",
    created_by: "user-1",
    hub: "HUB_A",
    message: null,
    priority: "normal",
    radius_miles: 50,
    expires_at: null,
    blast_sent_at: new Date().toISOString(),
    status: "active",
    accepted_by: null,
    accepted_at: null,
    drivers_notified: 3,
    drivers_viewed: 1,
    drivers_declined: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
});

const makeResponse = (overrides = {}) => ({
    id: "resp-1",
    blast_id: "blast-1",
    driver_id: "driver-1",
    status: "interested",
    response_time_ms: 5000,
    decline_reason: null,
    latitude: null,
    longitude: null,
    distance_miles: null,
    notified_at: new Date().toISOString(),
    responded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
});

function buildFromMock(blasts: unknown[], responses: unknown[]) {
    const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === "dispatch_blasts") {
            return {
                select: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ data: blasts, error: null }),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: blasts[0] ?? null, error: null }),
            };
        }
        if (table === "blast_responses") {
            return {
                select: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: responses, error: null }),
                insert: vi.fn().mockResolvedValue({ error: null }),
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                in2: vi.fn().mockReturnThis(),
            };
        }
        if (table === "daily_loads") {
            return {
                update: vi.fn().mockReturnThis(),
                eq: vi.fn().mockResolvedValue({ error: null }),
            };
        }
        return {};
    });
    return mockFrom;
}

function buildChannelMock() {
    const channel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
    };
    return vi.fn().mockReturnValue(channel);
}

// ─── Tests ─────────────────────────────────────────────

describe("useDispatchBlast", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: { id: "user-1" } });
        (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ toast: mockToast });
        (supabase as unknown as { removeChannel: ReturnType<typeof vi.fn> }).removeChannel = vi.fn();
    });

    it("starts with loading true and empty blasts", async () => {
        const blasts = [makeBlast()];
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(buildFromMock(blasts, []));
        (supabase.channel as ReturnType<typeof vi.fn>).mockImplementation(buildChannelMock());

        const { result } = renderHook(() => useDispatchBlast());

        expect(result.current.loading).toBe(true);
        expect(result.current.blasts).toEqual([]);
    });

    it("fetches blasts and attaches responses after mount", async () => {
        const blast = makeBlast();
        const response = makeResponse();
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(buildFromMock([blast], [response]));
        (supabase.channel as ReturnType<typeof vi.fn>).mockImplementation(buildChannelMock());

        const { result } = renderHook(() => useDispatchBlast());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.blasts).toHaveLength(1);
        expect(result.current.blasts[0].id).toBe("blast-1");
        expect(result.current.blasts[0].responses).toHaveLength(1);
        expect(result.current.blasts[0].responses[0].status).toBe("interested");
    });

    it("computes analytics correctly for active and accepted blasts", async () => {
        const activeBlast = makeBlast({ id: "b1", status: "active", drivers_notified: 5 });
        const acceptedBlast = makeBlast({ id: "b2", status: "accepted", drivers_notified: 3 });
        const response = makeResponse({ blast_id: "b1", response_time_ms: 10_000 });

        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
            buildFromMock([activeBlast, acceptedBlast], [response])
        );
        (supabase.channel as ReturnType<typeof vi.fn>).mockImplementation(buildChannelMock());

        const { result } = renderHook(() => useDispatchBlast());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const { analytics } = result.current;
        expect(analytics.activeBlasts).toBe(1);
        expect(analytics.totalBlasts).toBe(2);
        expect(analytics.assignmentRate).toBe(50); // 1/2 = 50%
        expect(analytics.totalNotified).toBe(8); // 5 + 3
        expect(analytics.avgResponseTimeSec).toBe(10); // 10000ms -> 10s
    });

    it("createBlast returns null when user is not authenticated", async () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ user: null });
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(buildFromMock([], []));
        (supabase.channel as ReturnType<typeof vi.fn>).mockImplementation(buildChannelMock());

        const { result } = renderHook(() => useDispatchBlast());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const blast = await result.current.createBlast({
            loadId: "load-1",
            hub: "HUB_A",
            driverIds: ["driver-1"],
        });

        expect(blast).toBeNull();
        expect(mockToast).not.toHaveBeenCalled();
    });

    it("expressInterest returns true on success and false on error", async () => {
        const blast = makeBlast();

        // Build a chainable mock where the last .eq() resolves with { error: null }
        const makeEqChain = (resolveWith: { error: unknown }) => {
            const firstEq = vi.fn();
            const secondEq = vi.fn().mockResolvedValue(resolveWith);
            firstEq.mockReturnValue({ eq: secondEq });
            return firstEq;
        };

        let blastResponseCallIndex = 0;
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
            if (table === "dispatch_blasts") {
                return {
                    select: vi.fn().mockReturnThis(),
                    or: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: [blast], error: null }),
                };
            }
            if (table === "blast_responses") {
                blastResponseCallIndex++;
                if (blastResponseCallIndex === 1) {
                    // fetchBlasts call
                    return {
                        select: vi.fn().mockReturnThis(),
                        in: vi.fn().mockReturnThis(),
                        order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    };
                }
                // expressInterest call: .update().eq().eq() -> { error: null }
                return { update: vi.fn().mockReturnValue({ eq: makeEqChain({ error: null }) }) };
            }
            return {};
        });
        (supabase.channel as ReturnType<typeof vi.fn>).mockImplementation(buildChannelMock());

        const { result } = renderHook(() => useDispatchBlast());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const success = await result.current.expressInterest("blast-1", "driver-1");
        expect(success).toBe(true);
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: expect.stringContaining("Interest sent") })
        );
    });
});
