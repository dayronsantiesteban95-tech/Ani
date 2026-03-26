import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useIsMobile } from "./use-mobile";

const MOBILE_WIDTH = 375;
const DESKTOP_WIDTH = 1024;

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

describe("useIsMobile", () => {
  let listeners: Array<() => void> = [];

  beforeEach(() => {
    listeners = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (_: string, cb: () => void) => { listeners.push(cb); },
        removeEventListener: (_: string, cb: () => void) => { listeners = listeners.filter((l) => l !== cb); },
        dispatchEvent: vi.fn(),
      }),
    });
  });

  afterEach(() => {
    listeners = [];
  });

  it("returns true when innerWidth is below breakpoint", () => {
    setWindowWidth(MOBILE_WIDTH);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when innerWidth is above breakpoint", () => {
    setWindowWidth(DESKTOP_WIDTH);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when window width crosses the breakpoint", () => {
    setWindowWidth(DESKTOP_WIDTH);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(MOBILE_WIDTH);
      listeners.forEach((l) => l());
    });

    expect(result.current).toBe(true);
  });

  it("returns false at exactly the breakpoint (768px)", () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
