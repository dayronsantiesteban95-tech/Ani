import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDriverGPS } from "./useDriverGPS";

// ─── Supabase mock ──────────────────────────────────────
vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn().mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null }),
        }),
    },
}));

const { supabase } = await import("@/integrations/supabase/client");

// ─── Geolocation mock helpers ───────────────────────────

type GeoSuccessCallback = (pos: GeolocationPosition) => void;
type GeoErrorCallback = (err: GeolocationPositionError) => void;

function makeGeoPosition(overrides: Partial<GeolocationCoordinates> = {}): GeolocationPosition {
    return {
        coords: {
            latitude: 34.05,
            longitude: -118.24,
            accuracy: 10,
            speed: 5,
            heading: 90,
            altitude: null,
            altitudeAccuracy: null,
            ...overrides,
        },
        timestamp: Date.now(),
    } as GeolocationPosition;
}

let watchSuccessCb: GeoSuccessCallback | null = null;
let watchErrorCb: GeoErrorCallback | null = null;
let getCurrentSuccessCb: GeoSuccessCallback | null = null;
let getCurrentErrorCb: GeoErrorCallback | null = null;

const mockGeolocation = {
    watchPosition: vi.fn((success: GeoSuccessCallback, error: GeoErrorCallback) => {
        watchSuccessCb = success;
        watchErrorCb = error;
        return 42; // watchId
    }),
    clearWatch: vi.fn(),
    getCurrentPosition: vi.fn((success: GeoSuccessCallback, error: GeoErrorCallback) => {
        getCurrentSuccessCb = success;
        getCurrentErrorCb = error;
    }),
};

const mockPermissions = {
    query: vi.fn().mockResolvedValue({
        state: "granted",
        addEventListener: vi.fn(),
    }),
};

beforeEach(() => {
    vi.clearAllMocks();
    watchSuccessCb = null;
    watchErrorCb = null;
    getCurrentSuccessCb = null;
    getCurrentErrorCb = null;

    Object.defineProperty(navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
        writable: true,
    });
    Object.defineProperty(navigator, "permissions", {
        value: mockPermissions,
        configurable: true,
        writable: true,
    });

    // Reset supabase mock chain
    vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
    } as never);
});

describe("useDriverGPS", () => {
    it("returns initial state with tracking=false and position=null", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );
        expect(result.current.tracking).toBe(false);
        expect(result.current.position).toBeNull();
        expect(result.current.error).toBeNull();
        expect(result.current.pingCount).toBe(0);
        expect(result.current.lastPingAt).toBeNull();
    });

    it("reads permission status on mount", async () => {
        renderHook(() => useDriverGPS({ driverId: "driver-1", enabled: false }));
        await waitFor(() => {
            expect(mockPermissions.query).toHaveBeenCalledWith({ name: "geolocation" });
        });
    });

    it("startTracking sets tracking=true and calls watchPosition", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });

        expect(result.current.tracking).toBe(true);
        expect(mockGeolocation.watchPosition).toHaveBeenCalledOnce();
    });

    it("updates position state when watchPosition calls success callback", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });

        act(() => {
            watchSuccessCb?.(makeGeoPosition());
        });

        expect(result.current.position).not.toBeNull();
        expect(result.current.position?.latitude).toBe(34.05);
        expect(result.current.position?.longitude).toBe(-118.24);
        expect(result.current.position?.speed).toBe(5);
        expect(result.current.error).toBeNull();
    });

    it("sets error state on geolocation error (non-permission)", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });

        act(() => {
            watchErrorCb?.({ code: 2, message: "Position unavailable" } as GeolocationPositionError);
        });

        expect(result.current.error).toBe("Position unavailable");
        expect(result.current.permissionStatus).not.toBe("denied");
    });

    it("sets permissionStatus=denied on permission denied error (code=1)", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });

        act(() => {
            watchErrorCb?.({ code: 1, message: "Permission denied" } as GeolocationPositionError);
        });

        expect(result.current.permissionStatus).toBe("denied");
        expect(result.current.error).toBe("Location permission denied");
    });

    it("stopTracking sets tracking=false and clears watch", () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });
        expect(result.current.tracking).toBe(true);

        act(() => {
            result.current.stopTracking();
        });

        expect(result.current.tracking).toBe(false);
        expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(42);
    });

    it("requestPermission resolves true when getCurrentPosition succeeds", async () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        let resolved: boolean | undefined;
        act(() => {
            result.current.requestPermission().then((val) => { resolved = val; });
        });

        act(() => {
            getCurrentSuccessCb?.(makeGeoPosition());
        });

        await waitFor(() => expect(resolved).toBe(true));
        expect(result.current.permissionStatus).toBe("granted");
    });

    it("requestPermission resolves false when getCurrentPosition fails", async () => {
        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        let resolved: boolean | undefined;
        act(() => {
            result.current.requestPermission().then((val) => { resolved = val; });
        });

        act(() => {
            getCurrentErrorCb?.({ code: 1, message: "denied" } as GeolocationPositionError);
        });

        await waitFor(() => expect(resolved).toBe(false));
    });

    it("sendPing inserts position to supabase driver_locations", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as never);

        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false, intervalMs: 5000 })
        );

        act(() => {
            result.current.startTracking();
        });

        // Simulate position update
        act(() => {
            watchSuccessCb?.(makeGeoPosition());
        });

        // The hook sends a ping after 2000ms timeout
        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        expect(supabase.from).toHaveBeenCalledWith("driver_locations");
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                driver_id: "driver-1",
                latitude: 34.05,
                longitude: -118.24,
            })
        );

        vi.useRealTimers();
    });

    it("increments pingCount after successful supabase insert", async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        vi.mocked(supabase.from).mockReturnValue({
            insert: vi.fn().mockResolvedValue({ error: null }),
        } as never);

        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false, intervalMs: 5000 })
        );

        act(() => {
            result.current.startTracking();
        });

        act(() => {
            watchSuccessCb?.(makeGeoPosition());
        });

        expect(result.current.pingCount).toBe(0);

        await act(async () => {
            vi.advanceTimersByTime(2500);
        });

        await waitFor(() => {
            expect(result.current.pingCount).toBe(1);
        });

        vi.useRealTimers();
    });

    it("sets permissionStatus to unavailable when geolocation is not supported", () => {
        Object.defineProperty(navigator, "geolocation", {
            value: undefined,
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        expect(result.current.permissionStatus).toBe("unavailable");
        expect(result.current.error).toBe("Geolocation not supported");
    });

    it("does not call watchPosition when geolocation is unavailable", () => {
        Object.defineProperty(navigator, "geolocation", {
            value: undefined,
            configurable: true,
            writable: true,
        });

        const { result } = renderHook(() =>
            useDriverGPS({ driverId: "driver-1", enabled: false })
        );

        act(() => {
            result.current.startTracking();
        });

        // tracking should remain false because navigator.geolocation is missing
        expect(result.current.tracking).toBe(false);
    });
});
