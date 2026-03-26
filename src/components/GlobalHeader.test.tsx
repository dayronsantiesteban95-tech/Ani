import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GlobalHeader } from "./GlobalHeader";

vi.mock("@/integrations/supabase/client");

vi.mock("@/components/NotificationCenter", () => ({
  NotificationCenter: () => <div data-testid="notification-center" />,
}));

vi.mock("@/assets/logo-azul.png", () => ({ default: "logo-azul.png" }));

describe("GlobalHeader", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the logo", () => {
    render(<GlobalHeader />);
    const logo = screen.getByAltText("Anika Logistics");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("src", "logo-azul.png");
  });

  it("renders all three city timezone clocks", () => {
    render(<GlobalHeader />);
    expect(screen.getByText("Atlanta")).toBeInTheDocument();
    expect(screen.getByText("Phoenix")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles")).toBeInTheDocument();
  });

  it("renders the NotificationCenter", () => {
    render(<GlobalHeader />);
    expect(screen.getByTestId("notification-center")).toBeInTheDocument();
  });

  it("displays time strings for each timezone on mount", () => {
    render(<GlobalHeader />);
    // Each city should be followed by a time string (HH:MM:SS AM/PM pattern)
    const timeElements = document.querySelectorAll(".font-mono");
    expect(timeElements).toHaveLength(3);
    timeElements.forEach((el) => {
      expect(el.textContent).toMatch(/\d{2}:\d{2}:\d{2}\s*(AM|PM)/i);
    });
  });

  it("updates times every second via setInterval", () => {
    const initialDate = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(initialDate);

    render(<GlobalHeader />);

    const timesBefore = Array.from(document.querySelectorAll(".font-mono")).map(
      (el) => el.textContent
    );

    act(() => {
      vi.setSystemTime(new Date("2024-01-01T12:00:05Z"));
      vi.advanceTimersByTime(5000);
    });

    const timesAfter = Array.from(document.querySelectorAll(".font-mono")).map(
      (el) => el.textContent
    );

    // After 5 seconds, times should have changed
    expect(timesAfter).not.toEqual(timesBefore);
  });
});
