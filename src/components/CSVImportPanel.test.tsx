import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CSVImportPanel from "./CSVImportPanel";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn(() => ({
                select: vi.fn(() => Promise.resolve({ data: [{ id: "1" }], error: null })),
            })),
        })),
    },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
    useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ user: { id: "user-123" } }),
}));

describe("CSVImportPanel", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders upload step by default", () => {
        render(<CSVImportPanel />);
        expect(screen.getByText("Import Loads from CSV")).toBeInTheDocument();
        expect(screen.getByText("Drop CSV file here or click to browse")).toBeInTheDocument();
        expect(screen.queryByText("Reset")).not.toBeInTheDocument();
    });

    it("shows Reset button after a file is loaded", async () => {
        render(<CSVImportPanel />);

        const csvContent = "reference_number,client_name\nREF-001,Acme Corp\n";
        const file = new File([csvContent], "loads.csv", { type: "text/csv" });

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText("Reset")).toBeInTheDocument();
        });
    });

    it("shows row/column counts and column mapping in preview step", async () => {
        render(<CSVImportPanel />);

        const csvContent = "reference_number,client_name\nREF-001,Acme Corp\nREF-002,Beta LLC\n";
        const file = new File([csvContent], "loads.csv", { type: "text/csv" });

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/2 rows/)).toBeInTheDocument();
            expect(screen.getByText(/2 columns/)).toBeInTheDocument();
        });
    });

    it("shows toast error for invalid (non-CSV) drag-dropped file", () => {
        render(<CSVImportPanel />);

        const dropZone = screen.getByText("Drop CSV file here or click to browse").closest("div")!;
        const badFile = new File(["data"], "image.png", { type: "image/png" });

        fireEvent.drop(dropZone, {
            dataTransfer: { files: [badFile] },
        });

        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Invalid file", variant: "destructive" })
        );
    });

    it("calls onImportComplete with success count after import", async () => {
        const { supabase } = await import("@/integrations/supabase/client");
        vi.mocked(supabase.from).mockReturnValue({
            insert: vi.fn(() => ({
                select: vi.fn(() => Promise.resolve({ data: [{ id: "1" }, { id: "2" }], error: null })),
            })),
        } as never);

        const onImportComplete = vi.fn();
        render(<CSVImportPanel onImportComplete={onImportComplete} />);

        const csvContent = "reference_number,client_name\nREF-001,Acme\nREF-002,Beta\n";
        const file = new File([csvContent], "loads.csv", { type: "text/csv" });
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        fireEvent.change(input, { target: { files: [file] } });

        await waitFor(() => screen.getByText(/Import 2 Loads/));
        fireEvent.click(screen.getByText(/Import 2 Loads/));

        await waitFor(() => {
            expect(screen.getByText("Import Complete!")).toBeInTheDocument();
        });
        expect(onImportComplete).toHaveBeenCalledWith(expect.any(Number));
    });
});
