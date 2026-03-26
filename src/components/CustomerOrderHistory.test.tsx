import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CustomerOrderHistory from "./CustomerOrderHistory";

const mockOrders = [
    {
        id: "1",
        reference_number: "REF-001",
        load_date: "2024-01-15",
        status: "delivered",
        delivery_address: "123 Main St",
        packages: 3,
        revenue: 150,
        service_type: "standard",
        pod_confirmed: true,
        driver_id: null,
    },
    {
        id: "2",
        reference_number: "REF-002",
        load_date: "2024-01-10",
        status: "pending",
        delivery_address: "456 Oak Ave",
        packages: 1,
        revenue: 75,
        service_type: "express",
        pod_confirmed: false,
        driver_id: null,
    },
];

function makeChain(result: { data: typeof mockOrders | null; error: object | null }) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.not = vi.fn(self);
    chain.order = vi.fn(self);
    chain.ilike = vi.fn(self);
    chain.limit = vi.fn().mockResolvedValue(result);
    return chain;
}

vi.mock("@/integrations/supabase/client", () => {
    const fromFn = vi.fn(() => makeChain({ data: [], error: null }));
    return { supabase: { from: fromFn } };
});

import { supabase } from "@/integrations/supabase/client";

describe("CustomerOrderHistory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
            () => makeChain({ data: [], error: null })
        );
    });

    it("renders search input and search button", () => {
        render(<CustomerOrderHistory />);
        expect(screen.getByPlaceholderText("Search client name...")).toBeInTheDocument();
        expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("shows close button when onClose prop provided", () => {
        const onClose = vi.fn();
        render(<CustomerOrderHistory onClose={onClose} />);
        const buttons = screen.getAllByRole("button");
        // Close button should be present (X icon)
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("calls onClose when close button is clicked", () => {
        const onClose = vi.fn();
        render(<CustomerOrderHistory onClose={onClose} />);
        // The X button is the first button in the header
        const buttons = screen.getAllByRole("button");
        // Find the close button (last one rendered in header area)
        const closeBtn = buttons.find((btn) => btn.classList.contains("h-6") && btn.classList.contains("w-6"));
        if (closeBtn) fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalled();
    });

    it("auto-fetches history when initialClient prop provided", async () => {
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
            () => makeChain({ data: mockOrders, error: null })
        );

        render(<CustomerOrderHistory clientName="Acme Corp" />);

        await waitFor(() => {
            expect(screen.getByText("Recent Orders (2)")).toBeInTheDocument();
        });
    });

    it("shows no orders message when search returns empty", async () => {
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
            () => makeChain({ data: [], error: null })
        );

        render(<CustomerOrderHistory clientName="Unknown Client" />);

        await waitFor(() => {
            expect(screen.getByText(/No orders found for/)).toBeInTheDocument();
        });
    });

    it("displays stats when orders are returned", async () => {
        (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
            () => makeChain({ data: mockOrders, error: null })
        );

        render(<CustomerOrderHistory clientName="Acme Corp" />);

        await waitFor(() => {
            expect(screen.getByText("2")).toBeInTheDocument(); // totalOrders
            expect(screen.getByText("50%")).toBeInTheDocument(); // successRate (1 of 2 delivered)
        });
    });
});
