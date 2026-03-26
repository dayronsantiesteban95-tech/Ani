import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import DispatchBlastPanel from "./DispatchBlast";

// Mock the hook so we don't need real Supabase
vi.mock("@/hooks/useDispatchBlast", () => ({
    useDispatchBlast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client");

import { useDispatchBlast } from "@/hooks/useDispatchBlast";

const mockUseDispatchBlast = useDispatchBlast as ReturnType<typeof vi.fn>;

const defaultHookReturn = {
    blasts: [],
    loading: false,
    analytics: {
        activeBlasts: 0,
        totalBlasts: 0,
        assignmentRate: 0,
        avgResponseTimeSec: 0,
        totalNotified: 0,
    },
    createBlast: vi.fn(),
    cancelBlast: vi.fn(),
    confirmAssignment: vi.fn(),
    expressInterest: vi.fn(),
    declineBlast: vi.fn(),
    refresh: vi.fn(),
};

const mockLoads = [
    {
        id: "load-1",
        reference_number: "REF-001",
        client_name: "Acme Corp",
        pickup_address: "Phoenix, AZ",
        delivery_address: "Tucson, AZ",
        miles: 120,
        revenue: 500,
        packages: 10,
        status: "pending",
        hub: "phoenix",
        service_type: "Standard",
    },
];

const mockDrivers = [
    { id: "driver-1", full_name: "Alice Smith", hub: "phoenix", status: "active" },
    { id: "driver-2", full_name: "Bob Jones", hub: "tucson", status: "active" },
    { id: "driver-3", full_name: "Charlie Brown", hub: "phoenix", status: "inactive" },
];

beforeEach(() => {
    mockUseDispatchBlast.mockReturnValue({ ...defaultHookReturn });
});

describe("DispatchBlastPanel", () => {
    it("renders the header and New Blast button", () => {
        render(<DispatchBlastPanel loads={[]} drivers={[]} />);

        expect(screen.getByText("Dispatch Blast")).toBeInTheDocument();
        expect(screen.getByText("New Blast")).toBeInTheDocument();
    });

    it("shows quick stats section when not compact", () => {
        mockUseDispatchBlast.mockReturnValue({
            ...defaultHookReturn,
            analytics: { ...defaultHookReturn.analytics, activeBlasts: 3, assignmentRate: 75, avgResponseTimeSec: 45 },
        });

        render(<DispatchBlastPanel loads={[]} drivers={[]} compact={false} />);

        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByText("Assigned")).toBeInTheDocument();
        expect(screen.getByText("Avg Response")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("hides quick stats in compact mode", () => {
        render(<DispatchBlastPanel loads={[]} drivers={[]} compact={true} />);

        expect(screen.queryByText("Active")).not.toBeInTheDocument();
        expect(screen.queryByText("Avg Response")).not.toBeInTheDocument();
    });

    it("shows empty state when no blasts and form is hidden", () => {
        render(<DispatchBlastPanel loads={[]} drivers={[]} compact={true} />);

        // In compact mode showCreate starts false, so empty state shows
        expect(screen.getByText("No blast history yet")).toBeInTheDocument();
    });

    it("shows loading indicator when loading is true", () => {
        mockUseDispatchBlast.mockReturnValue({ ...defaultHookReturn, loading: true });

        render(<DispatchBlastPanel loads={[]} drivers={[]} compact={true} />);

        expect(screen.getByText("Loading blasts...")).toBeInTheDocument();
    });

    it("filters active drivers by hub and renders driver chips in the create form", () => {
        render(
            <DispatchBlastPanel
                loads={mockLoads}
                drivers={mockDrivers}
                selectedLoadId="load-1"
                compact={false}
            />,
        );

        // The form is open by default (compact=false) — active drivers should appear
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        // Bob Jones is in a different hub — still active, shown in Other Hubs section
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
        // Charlie Brown is inactive — should not appear
        expect(screen.queryByText("Charlie Brown")).not.toBeInTheDocument();
    });

    it("toggles driver selection on click", () => {
        render(
            <DispatchBlastPanel
                loads={mockLoads}
                drivers={mockDrivers}
                selectedLoadId="load-1"
                compact={false}
            />,
        );

        // Initially 0 drivers selected — label shows "(0)"
        expect(screen.getByText(/Select Drivers \(0\)/)).toBeInTheDocument();

        // Click Alice Smith chip
        fireEvent.click(screen.getByText("Alice Smith"));

        // Now 1 driver selected
        expect(screen.getByText(/Select Drivers \(1\)/)).toBeInTheDocument();
    });

    it("renders blast history cards when blasts exist", () => {
        mockUseDispatchBlast.mockReturnValue({
            ...defaultHookReturn,
            blasts: [
                {
                    id: "blast-1",
                    load_id: "load-1",
                    created_by: "user-1",
                    hub: "phoenix",
                    message: "Urgent load available",
                    priority: "high",
                    radius_miles: 50,
                    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
                    blast_sent_at: new Date().toISOString(),
                    status: "active",
                    accepted_by: null,
                    accepted_at: null,
                    drivers_notified: 3,
                    drivers_viewed: 1,
                    drivers_declined: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    responses: [
                        {
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
                        },
                    ],
                },
            ],
        });

        render(<DispatchBlastPanel loads={mockLoads} drivers={mockDrivers} compact={false} />);

        // The blast card should show status and no empty state
        expect(screen.queryByText("No blast history yet")).not.toBeInTheDocument();
        // Should have high priority badge
        expect(screen.getByText(/high/i)).toBeInTheDocument();
    });

    it("renders the create form with load and driver sections in non-compact mode", () => {
        render(
            <DispatchBlastPanel
                loads={mockLoads}
                drivers={mockDrivers}
                compact={false}
            />,
        );

        // The create form should be visible with driver selection heading
        expect(screen.getByText(/Select Drivers/)).toBeInTheDocument();
    });

    it("renders driver chips from different hubs in the create form", () => {
        render(
            <DispatchBlastPanel
                loads={mockLoads}
                drivers={mockDrivers}
                selectedLoadId="load-1"
                compact={false}
            />,
        );

        // Both active drivers should appear (different hubs)
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
        expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    });
});
