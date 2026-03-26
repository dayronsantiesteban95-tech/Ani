import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NavLink } from "./NavLink";

describe("NavLink", () => {
  it("renders an anchor with correct text", () => {
    render(
      <MemoryRouter>
        <NavLink to="/test">Test Link</NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByText("Test Link")).toBeInTheDocument();
  });

  it("has correct href", () => {
    render(
      <MemoryRouter>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/dashboard");
  });

  it("has correct displayName", () => {
    expect(NavLink.displayName).toBe("NavLink");
  });
});
