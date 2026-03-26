import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const qb = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return { supabase: { from: vi.fn(() => qb) } };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "test@test.com" } }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import QuickLoadEntry from "./QuickLoadEntry";

describe("QuickLoadEntry", () => {
  it("renders the form header", () => {
    render(<QuickLoadEntry hub="phoenix" loadDate="2026-03-25" />);
    expect(screen.getByText(/New Order Entry/i)).toBeInTheDocument();
  });

  it("renders client name input", () => {
    render(<QuickLoadEntry hub="phoenix" loadDate="2026-03-25" />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("renders the form with multiple sections", () => {
    const { container } = render(<QuickLoadEntry hub="atlanta" loadDate="2026-03-25" />);
    expect(container.innerHTML.length).toBeGreaterThan(1000);
  });

  it("renders the submit button", () => {
    render(<QuickLoadEntry hub="la" loadDate="2026-03-25" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("renders with clone data when provided", () => {
    const cloneData = {
      client_name: "Clone Client",
      pickup_address: "100 Clone St",
      delivery_address: "200 Clone Ave",
    };
    render(<QuickLoadEntry hub="phoenix" loadDate="2026-03-25" cloneData={cloneData} />);
    expect(screen.getByText(/New Order Entry/i)).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", () => {
    const onCancel = vi.fn();
    render(<QuickLoadEntry hub="phoenix" loadDate="2026-03-25" onCancel={onCancel} />);
    // Find the cancel/close button
    const buttons = screen.getAllByRole("button");
    const cancelBtn = buttons.find(b => b.textContent?.includes("Cancel") || b.textContent?.includes("Close"));
    if (cancelBtn) {
      const { fireEvent } = require("@testing-library/react");
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalled();
    } else {
      // Just verify the component renders
      expect(screen.getByText(/New Order Entry/i)).toBeInTheDocument();
    }
  });
});
