import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ActivityLog from "./ActivityLog";

const mockQueryBuilder = (data: unknown[] = [], error: unknown = null) => {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.order = chain;
  builder.limit = chain;
  builder.eq = chain;
  builder.in = chain;
  builder.neq = chain;
  builder.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error }).then(resolve);
  return builder;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder()),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ActivityLog", () => {
  it("renders the Activity Log heading", async () => {
    render(<ActivityLog />);
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
  });

  it("shows loading spinner initially", () => {
    render(<ActivityLog />);
    // The refresh icon is rendered with animate-spin while loading
    const spinners = document.querySelectorAll(".animate-spin");
    expect(spinners.length).toBeGreaterThan(0);
  });

  it("shows empty state after loading with no data", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });
  });

  it("shows search input and filter select in normal mode", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search activity...")).toBeInTheDocument();
    });
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("hides search input in compact mode", async () => {
    render(<ActivityLog compact />);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Search activity...")).not.toBeInTheDocument();
    });
  });

  it("shows 0 events badge when no entries", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("0 events")).toBeInTheDocument();
    });
  });

  it("renders refresh button", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });
    // RefreshCw button without animate-spin is the manual refresh button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("filter select has correct options", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search activity...")).toBeInTheDocument();
    });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(["all", "load", "driver", "pod", "route"]);
  });

  it("search input updates on change", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search activity...")).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Search activity...");
    fireEvent.change(input, { target: { value: "test query" } });
    expect((input as HTMLInputElement).value).toBe("test query");
  });

  it("filter select updates on change", async () => {
    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "driver" } });
    expect(select.value).toBe("driver");
  });
});
