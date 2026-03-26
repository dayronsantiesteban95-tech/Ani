import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

import Index from "./Index";

describe("Index", () => {
  it("renders the welcome heading", () => {
    render(<Index />);
    expect(screen.getByText("Welcome to Your Blank App")).toBeInTheDocument();
  });

  it("renders the subtitle text", () => {
    render(<Index />);
    expect(
      screen.getByText("Start building your amazing project here!")
    ).toBeInTheDocument();
  });

  it("renders within a centered container", () => {
    const { container } = render(<Index />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("flex", "min-h-screen", "items-center", "justify-center");
  });
});
