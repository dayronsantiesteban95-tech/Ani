import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => {
  const qb = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return { supabase: { from: vi.fn(() => qb) } };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import LeadDetailPanel from "./LeadDetailPanel";

describe("LeadDetailPanel", () => {
  it("returns null when lead is null", () => {
    const { container } = render(
      <LeadDetailPanel lead={null} open={true} onClose={vi.fn()} onUpdate={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders company name when lead is provided", () => {
    const lead = {
      id: "1",
      company_name: "Test Corp",
      contact_person: "John Doe",
      stage: "qualified",
      email: "john@test.com",
      phone: "555-1234",
      industry: "logistics",
      hub: "phoenix",
      estimated_monthly_loads: 50,
      source: "referral",
    };
    render(
      <LeadDetailPanel lead={lead} open={true} onClose={vi.fn()} onUpdate={vi.fn()} />,
    );
    expect(screen.getByText("Test Corp")).toBeInTheDocument();
  });
});
