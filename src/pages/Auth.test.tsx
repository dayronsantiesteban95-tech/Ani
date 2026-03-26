import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Auth from "./Auth";

function makeQb(resolveValue: any = { data: [], error: null }) {
  const qb: any = {};
  for (const m of ['select','insert','update','delete','upsert','eq','neq','gt','lt','gte','lte','like','ilike','in','is','order','limit','range','single','maybeSingle','match','not','or','filter','rpc','count','csv','on','subscribe','unsubscribe']) qb[m] = vi.fn().mockReturnValue(qb);
  qb.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return qb;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQb()),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "u1" } } }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const { supabase } = await import("@/integrations/supabase/client");

describe("Auth", () => {
  it("renders the Anika Logistics title", () => {
    render(<Auth />);
    expect(screen.getByText("Anika Logistics")).toBeInTheDocument();
  });

  it("renders email and password inputs", () => {
    render(<Auth />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders the Sign In button", () => {
    render(<Auth />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows Forgot password link and switches to reset mode on click", () => {
    render(<Auth />);
    const forgotLink = screen.getByText("Forgot password?");
    expect(forgotLink).toBeInTheDocument();
    fireEvent.click(forgotLink);
    // Should switch to reset mode
    expect(screen.getByText("Reset your password")).toBeInTheDocument();
    expect(screen.getByText(/Send Reset Link/)).toBeInTheDocument();
  });

  it("shows Back to Sign In link in reset mode", () => {
    render(<Auth />);
    fireEvent.click(screen.getByText("Forgot password?"));
    const backLink = screen.getByText("Back to Sign In");
    expect(backLink).toBeInTheDocument();
    fireEvent.click(backLink);
    // Should switch back to sign in mode
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls signInWithPassword when form is submitted", async () => {
    render(<Auth />);
    const emailInput = screen.getByLabelText("Email");
    const passwordInput = screen.getByLabelText("Password");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("calls resetPasswordForEmail in reset mode", async () => {
    render(<Auth />);
    fireEvent.click(screen.getByText("Forgot password?"));
    const emailInput = screen.getByLabelText("Email");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "test@example.com",
        expect.objectContaining({ redirectTo: expect.any(String) }),
      );
    });
  });

  it("renders the branded footer text", () => {
    render(<Auth />);
    expect(screen.getByText(/Last-Mile Delivery/)).toBeInTheDocument();
  });
});
