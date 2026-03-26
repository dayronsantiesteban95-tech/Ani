import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import CommandBar from "./CommandBar";

// ── Supabase mock ─────────────────────────────────────────
const mockSelect = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      or: mockOr.mockReturnThis(),
      order: mockOrder.mockReturnThis(),
      limit: mockLimit.mockResolvedValue({ data: [] }),
    })),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ user: null, session: null }),
}));

function renderCommandBar() {
  return render(
    <MemoryRouter>
      <CommandBar />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnThis();
  mockOr.mockReturnThis();
  mockOrder.mockReturnThis();
  mockLimit.mockResolvedValue({ data: [] });
});

describe("CommandBar", () => {
  it("renders nothing when closed", () => {
    const { container } = renderCommandBar();
    expect(container).toBeEmptyDOMElement();
  });

  it("opens when Ctrl+K is pressed", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search loads, drivers/i)).toBeInTheDocument();
  });

  it("shows quick actions placeholder when open with no query", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Create new load")).toBeInTheDocument();
    expect(screen.getByText("Go to Load Board")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search loads, drivers/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByPlaceholderText(/search loads, drivers/i)).not.toBeInTheDocument();
  });

  it("shows no results message when query matches nothing", async () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    const input = screen.getByPlaceholderText(/search loads, drivers/i);
    fireEvent.change(input, { target: { value: "zzznomatch999" } });

    await waitFor(() => {
      expect(screen.getByText(/no results for/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it("closes when clicking the backdrop", () => {
    const { container } = renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByPlaceholderText(/search loads, drivers/i)).toBeInTheDocument();

    // The outermost fixed div is the backdrop click target
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);

    expect(screen.queryByPlaceholderText(/search loads, drivers/i)).not.toBeInTheDocument();
  });

  it("opens with Meta+K (Mac shortcut)", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByPlaceholderText(/search loads, drivers/i)).toBeInTheDocument();
  });

  it("displays quick action 'Go to Live Ops' when open", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Go to Live Ops")).toBeInTheDocument();
  });

  it("displays the 'Create new load' quick action", () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByText("Create new load")).toBeInTheDocument();
  });

  it("shows search results when query matches page names", async () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = screen.getByPlaceholderText(/search loads, drivers/i);
    fireEvent.change(input, { target: { value: "dashboard" } });
    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it("shows import loads action when searching 'import'", async () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = screen.getByPlaceholderText(/search loads, drivers/i);
    fireEvent.change(input, { target: { value: "import" } });
    await waitFor(() => {
      expect(screen.getByText("Import Loads from CSV")).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it("shows optimize route action when searching 'route'", async () => {
    renderCommandBar();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    const input = screen.getByPlaceholderText(/search loads, drivers/i);
    fireEvent.change(input, { target: { value: "route" } });
    await waitFor(() => {
      expect(screen.getByText("Optimize Route")).toBeInTheDocument();
    }, { timeout: 500 });
  });
});
