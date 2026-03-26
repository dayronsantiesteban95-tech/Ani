import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/integrations/supabase/client", () => {
  const qb = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    neq: vi.fn().mockResolvedValue({ count: 0, error: null }),
  };
  return {
    supabase: {
      from: vi.fn(() => qb),
      auth: { signOut: vi.fn().mockResolvedValue({}) },
    },
  };
});

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: vi.fn(() => ({ isOwner: false })),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { AppSidebar } from "./AppSidebar";
import { useUserRole } from "@/hooks/useUserRole";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.mocked(useUserRole).mockReturnValue({ isOwner: false });
    document.documentElement.classList.remove("dark");
  });

  it("renders all nav section labels", () => {
    renderSidebar();
    expect(screen.getByText("Operations")).toBeInTheDocument();
    expect(screen.getByText("CRM")).toBeInTheDocument();
    expect(screen.getByText("Fleet")).toBeInTheDocument();
    expect(screen.getByText("Resources")).toBeInTheDocument();
  });

  it("renders key navigation items", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Companies")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Fleet Tracker")).toBeInTheDocument();
  });

  it("hides Admin section when user is not an owner", () => {
    renderSidebar();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Management")).not.toBeInTheDocument();
  });

  it("shows Admin section when user is an owner", () => {
    vi.mocked(useUserRole).mockReturnValue({ isOwner: true });
    renderSidebar();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Team Management")).toBeInTheDocument();
  });

  it("toggles dark mode label when dark mode button is clicked", () => {
    renderSidebar();
    const darkBtn = screen.getByText("Dark Mode");
    expect(darkBtn).toBeInTheDocument();
    fireEvent.click(darkBtn.closest("button")!);
    expect(screen.getByText("Light Mode")).toBeInTheDocument();
  });
});
