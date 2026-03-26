import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useNotifications } from "./useNotifications";

vi.mock("@/integrations/supabase/client", () => {
    const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
    };
    return {
        supabase: {
            from: vi.fn(),
            channel: vi.fn(() => mockChannel),
            removeChannel: vi.fn(),
        },
    };
});

vi.mock("./useAuth", () => ({
    useAuth: () => ({ user: { id: "user-123" } }),
}));

const { supabase } = await import("@/integrations/supabase/client");

// Creates a thenable chain where eq() always returns itself so
// chains like update().eq().eq() can be awaited.
function makeMutationChain() {
    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn().mockImplementation(() => chain);
    chain.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected);
    chain.catch = (onRejected: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).catch(onRejected);
    chain.finally = (onFinally: () => void) =>
        Promise.resolve({ data: null, error: null }).finally(onFinally);
    return chain;
}

// Builds a chainable query builder. limit() resolves with data (terminal for fetch).
// update() and delete() return a thenable chain supporting any number of .eq() calls.
function makeFetchBuilder(data: unknown[], error: unknown = null) {
    const builder: Record<string, unknown> = {};
    const self = () => builder;
    builder.select = vi.fn().mockImplementation(self);
    builder.order = vi.fn().mockImplementation(self);
    builder.eq = vi.fn().mockImplementation(self);
    builder.in = vi.fn().mockResolvedValue({ data: null, error: null });
    builder.limit = vi.fn().mockResolvedValue({ data, error });
    builder.update = vi.fn().mockImplementation(() => makeMutationChain());
    builder.delete = vi.fn().mockImplementation(() => makeMutationChain());
    return builder;
}

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
    id: "notif-1",
    user_id: "user-123",
    type: "task_assigned" as const,
    title: "New task",
    message: "You have a new task",
    task_id: "task-1",
    triggered_by: null,
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
    };
    vi.mocked(supabase.channel).mockReturnValue(mockChannel as never);
    vi.mocked(supabase.removeChannel).mockResolvedValue({ error: null } as never);
});

describe("useNotifications", () => {
    it("returns loading=true initially then loading=false after fetch", async () => {
        const qb = makeFetchBuilder([]);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });
    });

    it("populates notifications and computes unreadCount correctly", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: true }),
            makeNotification({ id: "n3", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());

        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(3);
            expect(result.current.unreadCount).toBe(2);
        });
    });

    it("markAsRead updates local state and decrements unreadCount", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.unreadCount).toBe(2);

        void result.current.markAsRead("n1");

        await waitFor(() => {
            expect(result.current.notifications.find(n => n.id === "n1")?.is_read).toBe(true);
            expect(result.current.unreadCount).toBe(1);
        });
    });

    it("markAllAsRead sets all notifications to read and resets unreadCount", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        void result.current.markAllAsRead();

        await waitFor(() => {
            expect(result.current.notifications.every(n => n.is_read)).toBe(true);
            expect(result.current.unreadCount).toBe(0);
        });
    });

    it("deleteNotification removes the item and decrements unreadCount for unread items", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: true }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.unreadCount).toBe(1);

        void result.current.deleteNotification("n1");

        await waitFor(() => {
            expect(result.current.notifications).toHaveLength(1);
            expect(result.current.notifications[0].id).toBe("n2");
            expect(result.current.unreadCount).toBe(0);
        });
    });
});
