import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRealtimeDriverMap } from "./useRealtimeDriverMap";

type SubscribeCallback = (status: string) => void;
type InsertCallback = (payload: { new: unknown }) => void;

let capturedInsertCallback: InsertCallback | null = null;
let capturedSubscribeCallback: SubscribeCallback | null = null;

vi.mock("@/integrations/supabase/client", () => {
    const mockChannel = {
        on: vi.fn().mockImplementation((_event: string, _filter: unknown, cb: InsertCallback) => {
            capturedInsertCallback = cb;
            return mockChannel;
        }),
        subscribe: vi.fn().mockImplementation((cb: SubscribeCallback) => {
            capturedSubscribeCallback = cb;
            return mockChannel;
        }),
    };
    return {
        supabase: {
            rpc: vi.fn(),
            channel: vi.fn(() => mockChannel),
            removeChannel: vi.fn(),
        },
    };
});

const { supabase } = await import("@/integrations/supabase/client");

const makeRow = (overrides = {}) => ({
    driver_id: "driver-1",
    driver_name: "Alice",
    hub: "LA",
    latitude: 34.05,
    longitude: -118.24,
    speed: 10,
    heading: 90,
    battery_pct: 80,
    is_moving: true,
    active_load_id: "load-1",
    recorded_at: "2024-01-01T00:00:00Z",
    shift_status: "on_duty",
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    capturedInsertCallback = null;
    capturedSubscribeCallback = null;
});

describe("useRealtimeDriverMap", () => {
    it("starts in loading state", () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());
        expect(result.current.loading).toBe(true);
    });

    it("populates drivers after rpc fetch", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [makeRow()], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.drivers).toHaveLength(1);
        expect(result.current.drivers[0].driverId).toBe("driver-1");
        expect(result.current.drivers[0].name).toBe("Alice");
    });

    it("maps row fields to LiveDriver correctly", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [makeRow()], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        const d = result.current.drivers[0];
        expect(d.lat).toBe(34.05);
        expect(d.lng).toBe(-118.24);
        expect(d.battery).toBe(80);
        expect(d.isMoving).toBe(true);
        expect(d.activeLoadId).toBe("load-1");
        expect(d.shiftStatus).toBe("on_duty");
    });

    it("defaults shiftStatus to off_duty when null", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({
            data: [makeRow({ shift_status: null })],
            error: null,
        } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.drivers[0].shiftStatus).toBe("off_duty");
    });

    it("sets loading=false even on rpc error", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { message: "rpc failed" } } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.drivers).toHaveLength(0);
    });

    it("sets connected=true when subscription status is SUBSCRIBED", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            capturedSubscribeCallback?.("SUBSCRIBED");
        });

        expect(result.current.connected).toBe(true);
    });

    it("updates existing driver position on realtime INSERT", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [makeRow()], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.drivers).toHaveLength(1));

        act(() => {
            capturedInsertCallback?.({
                new: {
                    driver_id: "driver-1",
                    latitude: 35.0,
                    longitude: -119.0,
                    speed: 20,
                    heading: 180,
                    battery_pct: 70,
                    is_moving: true,
                    active_load_id: "load-2",
                    recorded_at: "2024-01-01T01:00:00Z",
                },
            });
        });

        expect(result.current.drivers[0].lat).toBe(35.0);
        expect(result.current.drivers[0].lng).toBe(-119.0);
        expect(result.current.drivers[0].activeLoadId).toBe("load-2");
    });

    it("refresh re-fetches driver positions", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [makeRow()], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(vi.mocked(supabase.rpc)).toHaveBeenCalledTimes(1);

        await act(async () => {
            await result.current.refresh();
        });

        expect(vi.mocked(supabase.rpc)).toHaveBeenCalledTimes(2);
    });

    it("re-fetches positions when a new unknown driver sends a GPS ping", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [makeRow()], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.drivers).toHaveLength(1));
        const callsBefore = vi.mocked(supabase.rpc).mock.calls.length;

        // Simulate a GPS INSERT from a driver not in our current list
        act(() => {
            capturedInsertCallback?.({
                new: {
                    driver_id: "driver-unknown",
                    latitude: 40.0,
                    longitude: -74.0,
                    speed: 5,
                    heading: 0,
                    battery_pct: 90,
                    is_moving: true,
                    active_load_id: null,
                    recorded_at: "2024-06-01T12:00:00Z",
                },
            });
        });

        // Should trigger a re-fetch since driver-unknown is not in the list
        await waitFor(() => {
            expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(callsBefore);
        });
    });

    it("handles multiple drivers from initial fetch", async () => {
        const rows = [
            makeRow({ driver_id: "driver-1", driver_name: "Alice", hub: "LA" }),
            makeRow({ driver_id: "driver-2", driver_name: "Bob", hub: "NYC", latitude: 40.71, longitude: -74.0 }),
            makeRow({ driver_id: "driver-3", driver_name: "Charlie", hub: "LA", is_moving: false }),
        ];
        vi.mocked(supabase.rpc).mockResolvedValue({ data: rows, error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.drivers).toHaveLength(3);
        expect(result.current.drivers.map(d => d.name)).toEqual(["Alice", "Bob", "Charlie"]);
    });

    it("sets connected=false when subscription status is not SUBSCRIBED", async () => {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            capturedSubscribeCallback?.("CLOSED");
        });

        expect(result.current.connected).toBe(false);
    });

    it("preserves other drivers when updating one driver's position", async () => {
        const rows = [
            makeRow({ driver_id: "d1", driver_name: "Alice" }),
            makeRow({ driver_id: "d2", driver_name: "Bob", latitude: 40.0, longitude: -74.0 }),
        ];
        vi.mocked(supabase.rpc).mockResolvedValue({ data: rows, error: null } as never);
        const { result } = renderHook(() => useRealtimeDriverMap());

        await waitFor(() => expect(result.current.drivers).toHaveLength(2));

        act(() => {
            capturedInsertCallback?.({
                new: {
                    driver_id: "d1",
                    latitude: 99.0,
                    longitude: -99.0,
                    speed: 50,
                    heading: 270,
                    battery_pct: 30,
                    is_moving: true,
                    active_load_id: "load-99",
                    recorded_at: "2024-06-01T12:00:00Z",
                },
            });
        });

        // d1 updated
        const d1 = result.current.drivers.find(d => d.driverId === "d1")!;
        expect(d1.lat).toBe(99.0);
        expect(d1.lng).toBe(-99.0);
        expect(d1.activeLoadId).toBe("load-99");

        // d2 unchanged
        const d2 = result.current.drivers.find(d => d.driverId === "d2")!;
        expect(d2.lat).toBe(40.0);
        expect(d2.lng).toBe(-74.0);
    });
});
