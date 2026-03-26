import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuth } from "./useAuth";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from "@/integrations/supabase/client";

const mockUnsubscribe = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
  (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    data: { session: null },
  });
});

describe("useAuth", () => {
  it("initializes with loading=true and user=null", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("sets user and loading=false when getSession resolves with a session", async () => {
    const mockUser = { id: "user-123", email: "test@example.com" };
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(mockUser);
  });

  it("sets user=null and loading=false when no session exists", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("updates user when onAuthStateChange fires with a new session", async () => {
    let authChangeCallback: (event: string, session: unknown) => void = () => {};
    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useAuth());

    const mockUser = { id: "user-456", email: "driver@example.com" };
    act(() => {
      authChangeCallback("SIGNED_IN", { user: mockUser });
    });

    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    expect(result.current.loading).toBe(false);
  });

  it("clears user when onAuthStateChange fires with null session (sign-out)", async () => {
    const mockUser = { id: "user-789", email: "active@example.com" };
    let authChangeCallback: (event: string, session: unknown) => void = () => {};

    (supabase.auth.onAuthStateChange as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    act(() => {
      authChangeCallback("SIGNED_OUT", null);
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.loading).toBe(false);
  });

  it("unsubscribes from auth changes on unmount", async () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });
});
