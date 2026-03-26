import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AiChatbot from "./AiChatbot";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AiChatbot", () => {
  it("renders the floating button", () => {
    render(<AiChatbot />);
    expect(screen.getByRole("button", { name: /open ai assistant/i })).toBeInTheDocument();
  });

  it("opens the chat panel when floating button is clicked", () => {
    render(<AiChatbot />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    expect(screen.getByText("Anika AI")).toBeInTheDocument();
  });

  it("shows suggestion buttons when chat is open and no messages", () => {
    render(<AiChatbot />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    expect(screen.getByText("How many leads are in each pipeline stage?")).toBeInTheDocument();
    expect(screen.getByText("Which tasks are overdue?")).toBeInTheDocument();
    expect(screen.getByText("Summarize today's workload")).toBeInTheDocument();
  });

  it("shows input textarea and send button when chat is open", () => {
    render(<AiChatbot />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    expect(screen.getByPlaceholderText("Ask about your CRM data...")).toBeInTheDocument();
  });

  it("closes the chat panel when button is clicked again", () => {
    render(<AiChatbot />);
    const btn = screen.getByRole("button", { name: /open ai assistant/i });
    fireEvent.click(btn);
    expect(screen.getByText("Anika AI")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText("Anika AI")).not.toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<AiChatbot />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    const sendBtn = screen.getByRole("button", { name: "" });
    expect(sendBtn).toBeDisabled();
  });

  it("send button is enabled when input has text", () => {
    render(<AiChatbot />);
    fireEvent.click(screen.getByRole("button", { name: /open ai assistant/i }));
    const textarea = screen.getByPlaceholderText("Ask about your CRM data...");
    fireEvent.change(textarea, { target: { value: "Hello" } });
    // Find the send button (icon button without label)
    const buttons = screen.getAllByRole("button");
    const sendBtn = buttons.find((b) => !b.getAttribute("aria-label"));
    expect(sendBtn).not.toBeDisabled();
  });
});
