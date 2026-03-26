import { describe, it, expect, vi, beforeEach } from "vitest";
import { optimizeRoute, geocodeAddress } from "./useRouteOptimizer";
import type { RoutePoint } from "./useRouteOptimizer";

// ─── helpers ──────────────────────────────────────────

const makePoint = (id: string, lat: number, lng: number, label = id): RoutePoint => ({
    id,
    label,
    lat,
    lng,
});

// ─── optimizeRoute ────────────────────────────────────

describe("optimizeRoute", () => {
    it("returns empty result for zero points", () => {
        const result = optimizeRoute([]);
        expect(result.stops).toHaveLength(0);
        expect(result.totalDistanceMiles).toBe(0);
        expect(result.totalDurationMinutes).toBe(0);
        expect(result.savingsVsOriginalMiles).toBe(0);
    });

    it("returns single stop with correct defaults for one point", () => {
        const points = [makePoint("A", 34.0, -118.0)];
        const result = optimizeRoute(points);
        expect(result.stops).toHaveLength(1);
        expect(result.stops[0].id).toBe("A");
        expect(result.stops[0].order).toBe(1);
        expect(result.stops[0].distanceFromPrev).toBe(0);
        expect(result.stops[0].cumulativeDistance).toBe(0);
        expect(result.totalDistanceMiles).toBe(0);
        expect(result.savingsVsOriginalMiles).toBe(0);
    });

    it("uses provided startTime for single stop arrival", () => {
        const points = [makePoint("A", 34.0, -118.0)];
        const result = optimizeRoute(points, { startTime: "09:30" });
        expect(result.stops[0].estimatedArrival).toBe("09:30");
    });

    it("uses default startTime 08:00 when not provided", () => {
        const points = [makePoint("A", 34.0, -118.0)];
        const result = optimizeRoute(points);
        expect(result.stops[0].estimatedArrival).toBe("08:00");
    });

    it("returns the correct number of stops for multiple points", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.06, -118.30),
            makePoint("C", 34.04, -118.20),
        ];
        const result = optimizeRoute(points);
        expect(result.stops).toHaveLength(3);
    });

    it("assigns sequential order values starting from 1", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
            makePoint("C", 34.00, -118.20),
        ];
        const result = optimizeRoute(points);
        const orders = result.stops.map((s) => s.order).sort((a, b) => a - b);
        expect(orders).toEqual([1, 2, 3]);
    });

    it("first stop has distanceFromPrev of 0", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
        ];
        const result = optimizeRoute(points);
        const first = result.stops.find((s) => s.order === 1)!;
        expect(first.distanceFromPrev).toBe(0);
    });

    it("totalDistanceMiles > 0 for distinct points", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
            makePoint("C", 34.00, -118.20),
        ];
        const result = optimizeRoute(points);
        expect(result.totalDistanceMiles).toBeGreaterThan(0);
    });

    it("totalDurationMinutes > 0 for distinct points", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
        ];
        const result = optimizeRoute(points);
        expect(result.totalDurationMinutes).toBeGreaterThan(0);
    });

    it("savingsVsOriginalMiles is >= 0 (optimizer never makes it worse)", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
            makePoint("C", 34.00, -118.20),
            makePoint("D", 34.08, -118.35),
        ];
        const result = optimizeRoute(points);
        expect(result.savingsVsOriginalMiles).toBeGreaterThanOrEqual(0);
    });

    it("uses custom minutesPerStop for stop duration", () => {
        const points = [makePoint("A", 34.0, -118.0)];
        const result = optimizeRoute(points, { minutesPerStop: 20 });
        expect(result.stops[0].estimatedDepartMinutes).toBe(20);
        expect(result.totalDurationMinutes).toBe(20);
    });

    it("respects per-stop estimatedMinutes override for multiple points", () => {
        const points: RoutePoint[] = [
            { ...makePoint("A", 34.0, -118.0), estimatedMinutes: 45 },
            { ...makePoint("B", 34.1, -118.1), estimatedMinutes: 15 },
        ];
        const result = optimizeRoute(points);
        // Each stop should use its own estimatedMinutes, not the default
        const stopA = result.stops.find((s) => s.id === "A")!;
        const stopB = result.stops.find((s) => s.id === "B")!;
        expect(stopA.estimatedDepartMinutes).toBe(45);
        expect(stopB.estimatedDepartMinutes).toBe(15);
    });

    it("cumulativeDistance increases monotonically across stops", () => {
        const points = [
            makePoint("A", 34.05, -118.25),
            makePoint("B", 34.10, -118.30),
            makePoint("C", 34.00, -118.20),
        ];
        const result = optimizeRoute(points);
        const sorted = [...result.stops].sort((a, b) => a.order - b.order);
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].cumulativeDistance).toBeGreaterThanOrEqual(sorted[i - 1].cumulativeDistance);
        }
    });
});

// ─── geocodeAddress ───────────────────────────────────

describe("geocodeAddress", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns lat/lng for a successful response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            json: () => Promise.resolve([{ lat: "34.0522", lon: "-118.2437" }]),
        }));

        const result = await geocodeAddress("Los Angeles, CA");
        expect(result).toEqual({ lat: 34.0522, lng: -118.2437 });
    });

    it("returns null when nominatim returns empty array", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            json: () => Promise.resolve([]),
        }));

        const result = await geocodeAddress("nonexistent place xyzzy");
        expect(result).toBeNull();
    });

    it("returns null on fetch error", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

        const result = await geocodeAddress("anything");
        expect(result).toBeNull();
    });
});
