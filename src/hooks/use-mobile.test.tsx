import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useIsMobile } from "./use-mobile";

const MOBILE_BREAKPOINT = 768;

function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

let changeListener: (() => void) | null = null;

beforeEach(() => {
  changeListener = null;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (_: string, fn: () => void) => { changeListener = fn; },
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
});

describe("useIsMobile", () => {
  it("returns false when window width is above mobile breakpoint", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true when window width is below mobile breakpoint", () => {
    setWindowWidth(MOBILE_BREAKPOINT - 1);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false at exactly the mobile breakpoint", () => {
    setWindowWidth(MOBILE_BREAKPOINT);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("updates when media query change event fires", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(375);
      changeListener?.();
    });

    expect(result.current).toBe(true);
  });
});
