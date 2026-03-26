import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAlerts } from "./useAlerts";

vi.mock("@/integrations/supabase/client", () => {
    const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
    };
    const mockFrom = vi.fn();
    return {
        supabase: {
            from: mockFrom,
            channel: vi.fn(() => mockChannel),
            removeChannel: vi.fn(),
        },
    };
});

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

const { supabase } = await import("@/integrations/supabase/client");

function makeQueryBuilder(data: unknown[], error: unknown = null) {
    const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data, error }),
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    return builder;
}

const makeAlert = (overrides = {}) => ({
    id: "alert-1",
    load_id: "load-1",
    driver_id: null,
    alert_type: "wait_time" as const,
    severity: "warning" as const,
    title: "Wait time exceeded",
    message: "Driver waiting 20 min",
    status: "active" as const,
    created_at: new Date().toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("useAlerts", () => {
    it("returns loading=true initially and loading=false after fetch", async () => {
        const qb = makeQueryBuilder([]);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useAlerts());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it("populates alerts from supabase response", async () => {
        const alert = makeAlert();
        const qb = makeQueryBuilder([alert]);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useAlerts());

        await waitFor(() => {
            expect(result.current.alerts).toHaveLength(1);
            expect(result.current.alerts[0].id).toBe("alert-1");
        });
    });

    it("computes stats correctly from alerts with different ages", async () => {
        const now = Date.now();
        const alerts = [
            makeAlert({ id: "a1", severity: "critical", created_at: new Date(now - 35 * 60_000).toISOString() }),
            makeAlert({ id: "a2", severity: "warning", created_at: new Date(now - 10 * 60_000).toISOString() }),
            makeAlert({ id: "a3", severity: "info", created_at: new Date(now - 2 * 60_000).toISOString() }),
        ];
        const qb = makeQueryBuilder(alerts);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useAlerts());

        await waitFor(() => {
            expect(result.current.stats.total).toBe(3);
        });

        // a1 is 35min old -> auto_ping (counted as critical)
        // a2 is 10min old -> warning escalation
        // a3 is 2min old -> info escalation
        expect(result.current.stats.critical).toBeGreaterThanOrEqual(1);
        expect(result.current.stats.warning).toBe(1);
        expect(result.current.stats.info).toBe(1);
    });

    it("acknowledgeAlert calls supabase update with status=acknowledged", async () => {
        const qb = makeQueryBuilder([makeAlert()]);
        const updateBuilder = {
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        qb.update = vi.fn().mockReturnValue(updateBuilder);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useAlerts());
        await waitFor(() => expect(result.current.loading).toBe(false));

        // Don't await — fetchAlerts is fire-and-forget inside acknowledgeAlert
        result.current.acknowledgeAlert("alert-1");

        await waitFor(() => {
            expect(qb.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: "acknowledged" })
            );
        });
    });

    it("dismissAll returns early and skips update when there are no alerts", async () => {
        const qb = makeQueryBuilder([]);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useAlerts());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await result.current.dismissAll();

        // ids.length === 0 -> early return, no update call
        expect(qb.update).not.toHaveBeenCalled();
        expect(result.current.alerts).toHaveLength(0);
    });
});
