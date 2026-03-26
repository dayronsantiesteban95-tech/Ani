import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";
import { SectionErrorBoundary } from "./SectionErrorBoundary";
import { PageSkeleton, ChartSkeleton, StatCardsSkeleton, TableSkeleton } from "./PageSkeleton";

function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
    if (shouldThrow) {
        throw new Error("Test error message");
    }
    return <div>Child content</div>;
}

describe("ErrorBoundary", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("renders children when no error occurs", () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={false} />
            </ErrorBoundary>
        );
        expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("renders error UI when a child throws", () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    });

    it("displays the error message in the error UI", () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    });

    it("renders a Reload Page button when error occurs", () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(screen.getByRole("button", { name: /Reload Page/i })).toBeInTheDocument();
    });

    it("logs the error via console.error when catching", () => {
        render(
            <ErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </ErrorBoundary>
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "ErrorBoundary caught:",
            expect.any(Error),
            expect.anything()
        );
    });
});

describe("SectionErrorBoundary", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    it("renders children when no error occurs", () => {
        render(
            <SectionErrorBoundary>
                <div>Section content</div>
            </SectionErrorBoundary>
        );
        expect(screen.getByText("Section content")).toBeInTheDocument();
    });

    it("renders error UI when a child throws", () => {
        render(
            <SectionErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        expect(screen.getByText("Something went wrong in this section")).toBeInTheDocument();
    });

    it("displays the error message", () => {
        render(
            <SectionErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        expect(screen.getByText("Test error message")).toBeInTheDocument();
    });

    it("renders Retry and Dismiss buttons", () => {
        render(
            <SectionErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        expect(screen.getByText("Retry")).toBeInTheDocument();
        expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    it("clicking Dismiss button does not throw", () => {
        render(
            <SectionErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        const dismissBtn = screen.getByText("Dismiss");
        expect(() => fireEvent.click(dismissBtn)).not.toThrow();
    });

    it("calls onRetry and resets state when Retry is clicked", () => {
        const onRetry = vi.fn();
        render(
            <SectionErrorBoundary onRetry={onRetry}>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        fireEvent.click(screen.getByText("Retry"));
        expect(onRetry).toHaveBeenCalled();
    });

    it("renders custom fallback when provided", () => {
        render(
            <SectionErrorBoundary fallback={<div>Custom fallback</div>}>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    });

    it("logs the error via console.error", () => {
        render(
            <SectionErrorBoundary>
                <ThrowingComponent shouldThrow={true} />
            </SectionErrorBoundary>
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            "SectionErrorBoundary caught:",
            expect.any(Error),
            expect.anything()
        );
    });
});

describe("PageSkeleton", () => {
    it("renders the PageSkeleton with title", () => {
        render(<PageSkeleton title="Test Page" />);
        expect(screen.getByText("Test Page")).toBeInTheDocument();
    });

    it("renders ChartSkeleton", () => {
        const { container } = render(<ChartSkeleton />);
        expect(container.querySelector(".glass-card")).toBeTruthy();
    });

    it("renders StatCardsSkeleton with default count", () => {
        const { container } = render(<StatCardsSkeleton />);
        // Default count is 4
        const cards = container.querySelectorAll(".glass-card");
        expect(cards.length).toBe(4);
    });

    it("renders TableSkeleton with custom rows", () => {
        const { container } = render(<TableSkeleton rows={3} />);
        expect(container.querySelector("div")).toBeTruthy();
    });
});
