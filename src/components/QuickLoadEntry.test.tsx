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
});
