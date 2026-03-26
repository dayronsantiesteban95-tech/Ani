import React from "react";

interface Props {
    children: React.ReactNode;
    /** Optional callback invoked when the user clicks "Retry". */
    onRetry?: () => void;
    /** Optional custom fallback UI to render instead of the default error card. */
    fallback?: React.ReactNode;
}

interface State {
    hasError: boolean;
    dismissed: boolean;
    error: Error | null;
}

/**
 * A lightweight error boundary for individual page sections.
 * Shows a compact dark-themed error card with Retry / Dismiss actions
 * instead of crashing the entire page.
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, dismissed: false, error: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, dismissed: false, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("SectionErrorBoundary caught:", error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, dismissed: false, error: null });
        this.props.onRetry?.();
    };

    private handleDismiss = () => {
        this.setState({ dismissed: true });
    };

    render() {
        if (this.state.hasError && !this.state.dismissed) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        color: "#f1f5f9",
                        fontFamily: "'Inter', system-ui, sans-serif",
                    }}
                >
                    <p
                        style={{
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "#f87171",
                            marginBottom: "0.375rem",
                        }}
                    >
                        Something went wrong in this section
                    </p>
                    <p
                        style={{
                            fontSize: "0.75rem",
                            color: "#94a3b8",
                            marginBottom: "0.75rem",
                            wordBreak: "break-word",
                        }}
                    >
                        {this.state.error?.message ?? "An unexpected error occurred."}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: "0.375rem 1rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: "#f97316",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                            }}
                        >
                            Retry
                        </button>
                        <button
                            onClick={this.handleDismiss}
                            style={{
                                padding: "0.375rem 1rem",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: "#334155",
                                color: "#94a3b8",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
