import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import IntegrationSyncPanel from "./IntegrationSyncPanel";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(),
    },
}));

vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe("IntegrationSyncPanel", () => {
    it("renders both integration cards with disconnected state by default", () => {
        render(<IntegrationSyncPanel />);

        expect(screen.getByText("Onfleet")).toBeInTheDocument();
        expect(screen.getByText("OnTime 360")).toBeInTheDocument();
        expect(screen.getAllByText("Not Set Up")).toHaveLength(2);
    });

    it("shows Connected badges and enables sync buttons when integrations are connected", () => {
        render(<IntegrationSyncPanel onfleetConnected ontime360Connected />);

        expect(screen.getAllByText("Connected")).toHaveLength(2);

        const syncButtons = screen.getAllByRole("button");
        const onfleetBtn = syncButtons.find((b) => b.textContent?.includes("Sync Loads"));
        const ontimeBtn = syncButtons.find((b) => b.textContent?.includes("Sync Orders"));

        expect(onfleetBtn).not.toBeDisabled();
        expect(ontimeBtn).not.toBeDisabled();
    });

    it("disables sync buttons when integrations are not connected", () => {
        render(<IntegrationSyncPanel onfleetConnected={false} ontime360Connected={false} />);

        const buttons = screen.getAllByRole("button");
        const syncButtons = buttons.filter(
            (b) => b.textContent?.includes("Sync Loads") || b.textContent?.includes("Sync Orders"),
        );

        syncButtons.forEach((btn) => expect(btn).toBeDisabled());
    });

    it("calls onSyncOnfleet and shows success toast on successful sync", async () => {
        const onSyncOnfleet = vi.fn().mockResolvedValue({ synced: 5, errors: [] });

        render(<IntegrationSyncPanel onfleetConnected onSyncOnfleet={onSyncOnfleet} />);

        const syncBtn = screen.getByRole("button", { name: /sync loads/i });
        fireEvent.click(syncBtn);

        await waitFor(() => {
            expect(onSyncOnfleet).toHaveBeenCalledTimes(1);
        });

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({ title: expect.stringContaining("Sync complete") }),
            );
        });

        expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("displays lastSync result passed via props", () => {
        const lastSync = {
            source: "onfleet" as const,
            synced: 12,
            errors: [],
            timestamp: new Date().toISOString(),
        };

        render(<IntegrationSyncPanel lastSync={lastSync} />);

        expect(screen.getByText("12")).toBeInTheDocument();
        expect(screen.getAllByText(/onfleet/i).length).toBeGreaterThan(0);
    });

    it("shows error count in last sync result when sync has errors", async () => {
        const onSyncOntime360 = vi.fn().mockResolvedValue({ synced: 3, errors: ["err1", "err2"] });

        render(<IntegrationSyncPanel ontime360Connected onSyncOntime360={onSyncOntime360} />);

        const syncBtn = screen.getByRole("button", { name: /sync orders/i });
        fireEvent.click(syncBtn);

        await waitFor(() => {
            expect(screen.getByText(/2 errors/i)).toBeInTheDocument();
        });
    });
});
