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

  it("renders compact mode with minimal UI", async () => {
    render(<ActivityLog compact />);
    // Compact mode should still show the heading
    expect(screen.getByText("Activity Log")).toBeInTheDocument();
    // But not the search input
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Search activity...")).not.toBeInTheDocument();
    });
  });

  it("renders activity entries when data is returned", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const statusEvents = [
      { id: "evt1", load_id: "l1", new_status: "in_transit", old_status: "assigned", note: "Driver en route", recorded_at: new Date().toISOString() },
    ];
    const loads = [
      { id: "l1", reference_number: "ANK-001", client_name: "Activity Client", status: "in_transit", created_at: new Date().toISOString(), driver_id: "d1", updated_at: new Date().toISOString() },
    ];
    const shifts = [
      { id: "s1", driver_id: "d1", shift_start: new Date().toISOString(), shift_end: null },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "load_status_events") return mockQueryBuilder(statusEvents) as any;
      if (table === "daily_loads") return mockQueryBuilder(loads) as any;
      if (table === "driver_shifts") return mockQueryBuilder(shifts) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText(/Status changed to in_transit/)).toBeInTheDocument();
    });
  });

  it("renders events count badge with correct number", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const loads = [
      { id: "l1", reference_number: "ANK-001", client_name: "Count Client", status: "assigned", created_at: new Date().toISOString(), driver_id: null, updated_at: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "daily_loads") return mockQueryBuilder(loads) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("1 events")).toBeInTheDocument();
    });
  });

  it("renders driver assigned entry when load has driver_id", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const loads = [
      { id: "l1", reference_number: "ANK-099", client_name: "Assigned Client", status: "in_transit", created_at: new Date().toISOString(), driver_id: "d1", updated_at: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "daily_loads") return mockQueryBuilder(loads) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("Driver assigned")).toBeInTheDocument();
    });
  });

  it("renders shift started entry when shift has no end", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const shifts = [
      { id: "s1", driver_id: "d1", shift_start: new Date().toISOString(), shift_end: null },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "driver_shifts") return mockQueryBuilder(shifts) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("Shift started")).toBeInTheDocument();
    });
  });

  it("renders shift ended entry when shift has end", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const shifts = [
      { id: "s2", driver_id: "d1", shift_start: new Date(Date.now() - 3600000).toISOString(), shift_end: new Date().toISOString() },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "driver_shifts") return mockQueryBuilder(shifts) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("Shift ended")).toBeInTheDocument();
    });
  });

  it("filters entries when filter is set to driver", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const loads = [
      { id: "l1", reference_number: "ANK-001", client_name: "Load Client", status: "assigned", created_at: new Date().toISOString(), driver_id: null, updated_at: new Date().toISOString() },
    ];
    const shifts = [
      { id: "s1", driver_id: "d1", shift_start: new Date().toISOString(), shift_end: null },
    ];

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "daily_loads") return mockQueryBuilder(loads) as any;
      if (table === "driver_shifts") return mockQueryBuilder(shifts) as any;
      return mockQueryBuilder() as any;
    });

    render(<ActivityLog />);
    await waitFor(() => {
      expect(screen.getByText("Load created")).toBeInTheDocument();
    });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "driver" } });
    // After filtering to driver, load entries should be hidden
    expect(screen.queryByText("Load created")).not.toBeInTheDocument();
    expect(screen.getByText("Shift started")).toBeInTheDocument();
  });
});
