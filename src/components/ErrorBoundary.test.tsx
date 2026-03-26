import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

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
