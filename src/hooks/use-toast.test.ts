import { describe, it, expect } from "vitest";
import { reducer } from "./use-toast";

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
