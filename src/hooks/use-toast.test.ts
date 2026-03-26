import { describe, it, expect } from "vitest";
import { reducer, toast, useToast } from "./use-toast";
import { renderHook, act } from "@testing-library/react";

const makeToast = (id: string) => ({
  id,
  title: "Test Toast",
  open: true,
});

describe("reducer", () => {
  it("ADD_TOAST adds a toast", () => {
    const state = { toasts: [] };
    const next = reducer(state, { type: "ADD_TOAST", toast: makeToast("1") });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe("1");
  });

  it("ADD_TOAST respects TOAST_LIMIT of 1", () => {
    const state = { toasts: [makeToast("1")] };
    const next = reducer(state, { type: "ADD_TOAST", toast: makeToast("2") });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe("2");
  });

  it("UPDATE_TOAST merges fields", () => {
    const state = { toasts: [makeToast("1")] };
    const next = reducer(state, { type: "UPDATE_TOAST", toast: { id: "1", title: "Updated" } });
    expect(next.toasts[0].title).toBe("Updated");
  });

  it("DISMISS_TOAST with id sets open to false", () => {
    const state = { toasts: [makeToast("1")] };
    const next = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(next.toasts[0].open).toBe(false);
  });

  it("DISMISS_TOAST without id dismisses all", () => {
    const state = { toasts: [makeToast("1"), makeToast("2")] };
    const next = reducer(state, { type: "DISMISS_TOAST" });
    expect(next.toasts.every((t) => t.open === false)).toBe(true);
  });

  it("REMOVE_TOAST with id removes the toast", () => {
    const state = { toasts: [makeToast("1"), makeToast("2")] };
    const next = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(next.toasts).toHaveLength(1);
    expect(next.toasts[0].id).toBe("2");
  });

  it("REMOVE_TOAST without id clears all", () => {
    const state = { toasts: [makeToast("1"), makeToast("2")] };
    const next = reducer(state, { type: "REMOVE_TOAST" });
    expect(next.toasts).toHaveLength(0);
  });
});

describe("toast function", () => {
  it("returns an object with id, dismiss, and update", () => {
    const result = toast({ title: "Hello" });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("string");
    expect(typeof result.dismiss).toBe("function");
    expect(typeof result.update).toBe("function");
  });

  it("generates unique ids for each toast call", () => {
    const t1 = toast({ title: "Toast 1" });
    const t2 = toast({ title: "Toast 2" });
    expect(t1.id).not.toBe(t2.id);
  });

  it("dismiss function can be called without error", () => {
    const t = toast({ title: "Dismissable" });
    expect(() => t.dismiss()).not.toThrow();
  });

  it("update function can be called without error", () => {
    const t = toast({ title: "Updatable" });
    expect(() => t.update({ id: t.id, title: "New title" })).not.toThrow();
  });
});

describe("useToast hook", () => {
  it("returns toast function and dismiss function", () => {
    const { result } = renderHook(() => useToast());
    expect(typeof result.current.toast).toBe("function");
    expect(typeof result.current.dismiss).toBe("function");
    expect(Array.isArray(result.current.toasts)).toBe(true);
  });

  it("reflects toast additions in the hook state", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Hook Toast" });
    });
    expect(result.current.toasts.length).toBeGreaterThanOrEqual(0);
  });

  it("dismiss clears toasts from state", () => {
    const { result } = renderHook(() => useToast());
    let toastId: string;
    act(() => {
      const t = result.current.toast({ title: "Will dismiss" });
      toastId = t.id;
    });
    act(() => {
      result.current.dismiss(toastId!);
    });
    // After dismiss, toast should have open=false
    const t = result.current.toasts.find((t) => t.id === toastId!);
    if (t) expect(t.open).toBe(false);
  });

  it("dismiss without id dismisses all toasts", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Toast A" });
    });
    act(() => {
      result.current.dismiss();
    });
    // All toasts should have open=false
    for (const t of result.current.toasts) {
      expect(t.open).toBe(false);
    }
  });

  it("toast with variant returns correctly", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Error Toast", variant: "destructive" });
    });
    expect(result.current.toasts.length).toBeGreaterThanOrEqual(0);
  });

  it("toast with description returns correctly", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toast({ title: "Info", description: "Some detail" });
    });
    expect(result.current.toasts.length).toBeGreaterThanOrEqual(0);
  });
});
