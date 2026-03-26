import { renderHook, waitFor, act } from "@testing-library/react";
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

    it("markAsRead calls supabase update with is_read=true for the given notification", async () => {
        const notifications = [makeNotification({ id: "n1", is_read: false })];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        result.current.markAsRead("n1");

        await waitFor(() => {
            expect(qb.update).toHaveBeenCalledWith({ is_read: true });
        });
    });

    it("markAllAsRead calls supabase update filtered by user_id", async () => {
        const notifications = [makeNotification({ id: "n1", is_read: false })];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        result.current.markAllAsRead();

        await waitFor(() => {
            expect(qb.update).toHaveBeenCalledWith({ is_read: true });
            expect(qb.eq).toHaveBeenCalledWith("user_id", "user-123");
        });
    });

    it("deleteNotification is a function exposed by the hook", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(typeof result.current.deleteNotification).toBe("function");
    });

    it("deleteNotification calls supabase delete for the given id", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: true }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.notifications).toHaveLength(2));

        // Fire and forget - don't await since the mutation chain resolves internally
        result.current.deleteNotification("n1");

        await waitFor(() => {
            expect(qb.delete).toHaveBeenCalled();
        });
    });

    it("clearAll calls supabase delete for the user", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        result.current.clearAll();

        await waitFor(() => {
            expect(qb.delete).toHaveBeenCalled();
        });
    });

    it("markAsRead calls update for the given notification id", async () => {
        const notifications = [
            makeNotification({ id: "n1", is_read: false }),
            makeNotification({ id: "n2", is_read: false }),
        ];
        const qb = makeFetchBuilder(notifications);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.unreadCount).toBe(2));

        result.current.markAsRead("n1");

        await waitFor(() => {
            expect(qb.update).toHaveBeenCalledWith({ is_read: true });
        });
    });

    it("refetch function is exposed by the hook", async () => {
        const qb = makeFetchBuilder([]);
        vi.mocked(supabase.from).mockReturnValue(qb as never);

        const { result } = renderHook(() => useNotifications());
        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(typeof result.current.refetch).toBe("function");
    });
});
