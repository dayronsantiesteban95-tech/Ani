import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

vi.mock("react-router-dom", async () => {
  const a = await vi.importActual("react-router-dom");
  return { ...a, useNavigate: vi.fn(() => vi.fn()) };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/bogus"]}>
      <NotFound />
    </MemoryRouter>,
  );
}

describe("NotFound", () => {
  it("renders the 404 heading", () => {
    renderPage();
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("shows 'Route not found' message", () => {
    renderPage();
    expect(screen.getByText("Route not found")).toBeInTheDocument();
  });

  it("renders Go Back and Dashboard buttons", () => {
    renderPage();
    expect(screen.getByText("Go Back")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
