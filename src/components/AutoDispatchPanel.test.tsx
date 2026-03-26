import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AutoDispatchPanel from "./AutoDispatchPanel";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn(),
    },
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

import { supabase } from "@/integrations/supabase/client";

const mockFrom = supabase.from as ReturnType<typeof vi.fn>;
const mockRpc = supabase.rpc as ReturnType<typeof vi.fn>;

/** Creates a thenable mock query chain — every method returns itself, awaiting resolves to { data, error } */
function mockQuery(data: unknown, error: unknown = null) {
    const result = { data, error };
    const chain: Record<string, unknown> = {
        select: vi.fn(),
        eq: vi.fn(),
        neq: vi.fn(),
        update: vi.fn(),
        then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
        catch: (onRejected: (e: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
    };
    // Make all chainable methods return the same chain
    (chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.neq as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    (chain.update as ReturnType<typeof vi.fn>).mockReturnValue(chain);
    return chain;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [], error: null });
});

describe("AutoDispatchPanel", () => {
    it("shows loading state on initial render", () => {
        // Never resolves — keeps component in loading state
        const pending = new Promise(() => {});
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnValue(pending),
            then: () => pending,
        });

        render(<AutoDispatchPanel loadId="load-1" />);
        expect(screen.getByText(/finding best drivers/i)).toBeInTheDocument();
    });

    it("shows no-drivers message when drivers query returns empty", async () => {
        mockFrom.mockImplementation(() => mockQuery([]));

        render(<AutoDispatchPanel loadId="load-1" />);

        await waitFor(() => {
            expect(screen.getByText(/no active drivers available/i)).toBeInTheDocument();
        });
    });

    it("renders best match and other candidates after fetch", async () => {
        const drivers = [
            { id: "d1", full_name: "Alice Smith", hub: "HUB-A", status: "active" },
            { id: "d2", full_name: "Bob Jones", hub: "HUB-B", status: "active" },
        ];

        mockFrom.mockImplementation((table: string) => {
            if (table === "drivers") return mockQuery(drivers);
            return mockQuery([]); // daily_loads returns no rows
        });

        render(<AutoDispatchPanel loadId="load-1" loadHub="HUB-A" />);

        await waitFor(() => {
            expect(screen.getByText("Alice Smith")).toBeInTheDocument();
            expect(screen.getByText("Bob Jones")).toBeInTheDocument();
        });

        expect(screen.getByText(/best match/i)).toBeInTheDocument();
        expect(screen.getByText(/other available drivers/i)).toBeInTheDocument();
    });

    it("displays pickup address when provided", async () => {
        const drivers = [
            { id: "d1", full_name: "Alice Smith", hub: "HUB-A", status: "active" },
        ];

        mockFrom.mockImplementation((table: string) => {
            if (table === "drivers") return mockQuery(drivers);
            return mockQuery([]);
        });

        render(
            <AutoDispatchPanel
                loadId="load-1"
                loadPickupAddress="123 Main St, Springfield"
            />
        );

        await waitFor(() => {
            expect(screen.getByText("123 Main St, Springfield")).toBeInTheDocument();
        });
    });

    it("calls onAssigned with driver id when assign button is clicked", async () => {
        const drivers = [
            { id: "d1", full_name: "Alice Smith", hub: "HUB-A", status: "active" },
        ];
        const onAssigned = vi.fn();

        mockFrom.mockImplementation((table: string) => {
            if (table === "drivers") return mockQuery(drivers);
            return mockQuery(null); // daily_loads (both fetch and update)
        });

        render(<AutoDispatchPanel loadId="load-1" onAssigned={onAssigned} />);

        // Wait for candidate to appear, then click the assign button
        await waitFor(() => {
            expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        });

        const assignBtn = screen.getByRole("button", { name: /assign/i });
        fireEvent.click(assignBtn);

        await waitFor(() => {
            expect(onAssigned).toHaveBeenCalledWith("d1");
        });
    });
});
