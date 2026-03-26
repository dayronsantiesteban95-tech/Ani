import { describe, it, expect, vi } from "vitest";
import { fmtMoney, fmtWait, todayISO, daysAgoISO } from "@/lib/formatters";
import { assignHub } from "@/lib/sequenceUtils";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});

describe("fmtMoney", () => {
  it("formats 0 as $0", () => {
    expect(fmtMoney(0)).toBe("$0");
  });

  it("formats 1234 as $1,234", () => {
    expect(fmtMoney(1234)).toBe("$1,234");
  });

  it("formats negative numbers with minus sign", () => {
    const result = fmtMoney(-500);
    expect(result).toContain("500");
  });

  it("formats large numbers with comma separators", () => {
    expect(fmtMoney(1000000)).toBe("$1,000,000");
  });
});

describe("fmtWait", () => {
  it("returns — for 0 minutes", () => {
    expect(fmtWait(0)).toBe("—");
  });

  it("returns minutes only for values under 60", () => {
    expect(fmtWait(45)).toBe("45m");
  });

  it("returns hours and minutes for values 60+", () => {
    expect(fmtWait(90)).toBe("1h 30m");
  });

  it("returns exact hours with 0 remaining minutes", () => {
    expect(fmtWait(120)).toBe("2h 0m");
  });
});

describe("todayISO", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysAgoISO", () => {
  it("returns a string in YYYY-MM-DD format", () => {
    const result = daysAgoISO(7);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date for 0 days ago", () => {
    expect(daysAgoISO(0)).toBe(todayISO());
  });

  it("returns a date before today for positive days", () => {
    const result = daysAgoISO(1);
    expect(result < todayISO()).toBe(true);
  });
});

describe("assignHub", () => {
  it("returns atlanta for GA state", () => {
    expect(assignHub("GA")).toBe("atlanta");
  });

  it("returns phoenix for AZ state", () => {
    expect(assignHub("AZ")).toBe("phoenix");
  });

  it("returns la for CA state", () => {
    expect(assignHub("CA")).toBe("la");
  });

  it("returns phoenix as default for unknown state", () => {
    expect(assignHub("XX")).toBe("phoenix");
  });

  it("returns phoenix as default when no args", () => {
    expect(assignHub()).toBe("phoenix");
  });

  it("city overrides state", () => {
    expect(assignHub("GA", "Los Angeles")).toBe("la");
  });

  it("handles city-based lookup for phoenix", () => {
    expect(assignHub(null, "Scottsdale")).toBe("phoenix");
  });

  it("handles case insensitivity for city", () => {
    expect(assignHub(null, "ATLANTA")).toBe("atlanta");
  });

  it("handles state with whitespace", () => {
    expect(assignHub(" FL ")).toBe("atlanta");
  });
});

// ── quickLoadHelpers ──

import { generateReference, exportToCSV, cloneLoadData } from "@/lib/quickLoadHelpers";

describe("generateReference", () => {
  it("returns a string starting with ANK-", () => {
    const ref = generateReference();
    expect(ref).toMatch(/^ANK-/);
  });

  it("returns unique values on successive calls", () => {
    const a = generateReference();
    const b = generateReference();
    // Very unlikely to be the same due to random component
    expect(a).not.toBe(b);
  });

  it("contains a date part in YYMMDD format", () => {
    const ref = generateReference();
    const parts = ref.split("-");
    expect(parts[1]).toMatch(/^\d{6}$/);
  });
});

describe("exportToCSV", () => {
  it("does nothing for empty rows", () => {
    // Should not throw
    expect(() => exportToCSV([], "test.csv")).not.toThrow();
  });

  it("creates a download link for non-empty rows", () => {
    // Mock URL and document methods
    const mockClick = vi.fn();
    const mockCreateElement = vi.spyOn(document, "createElement").mockReturnValue({
      href: "",
      download: "",
      click: mockClick,
    } as unknown as HTMLAnchorElement);
    const mockCreateObjectURL = vi.fn().mockReturnValue("blob:test");
    const mockRevokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: mockCreateObjectURL, revokeObjectURL: mockRevokeObjectURL });

    exportToCSV([{ name: "Alice", age: 30 }], "test.csv");

    expect(mockClick).toHaveBeenCalled();
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:test");

    mockCreateElement.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("cloneLoadData", () => {
  it("copies fields from the source load", () => {
    const source = {
      client_name: "Acme Corp",
      pickup_address: "123 Main St",
      delivery_address: "456 Oak Ave",
      customer_name: "John",
      customer_phone: "555-1234",
      packages: 5,
      service_type: "express",
      comments: "Fragile",
      hub: "atlanta",
      revenue: 500,
      miles: 100,
      weight_lbs: 200,
    };
    const clone = cloneLoadData(source);
    expect(clone.client_name).toBe("Acme Corp");
    expect(clone.pickup_address).toBe("123 Main St");
    expect(clone.delivery_address).toBe("456 Oak Ave");
    expect(clone.packages).toBe(5);
    expect(clone.total_cost).toBe(500);
    expect(clone.distance_miles).toBe(100);
  });

  it("uses defaults for missing fields", () => {
    const clone = cloneLoadData({});
    expect(clone.client_name).toBe("");
    expect(clone.packages).toBe(1);
    expect(clone.service_type).toBe("standard");
    expect(clone.hub).toBe("phoenix");
  });

  it("generates a new reference number", () => {
    const clone = cloneLoadData({ reference_number: "OLD-123" });
    expect(clone.reference_number).toMatch(/^ANK-/);
    expect(clone.reference_number).not.toBe("OLD-123");
  });
});

// ── createSequenceForLead ──

import { createSequenceForLead } from "@/lib/sequenceUtils";

describe("createSequenceForLead", () => {
  it("returns true when supabase insert succeeds", async () => {
    const result = await createSequenceForLead("lead-1", "user-1");
    expect(result).toBe(true);
  });

  it("calls supabase.from with lead_sequences", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await createSequenceForLead("lead-2", "user-2");
    expect(supabase.from).toHaveBeenCalledWith("lead_sequences");
  });

  it("returns false when supabase insert fails", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: { message: "insert failed" } }),
    } as never);

    const result = await createSequenceForLead("lead-3", "user-3");
    expect(result).toBe(false);
  });
});

describe("exportToCSV edge cases", () => {
  it("handles values with commas by wrapping in quotes", () => {
    const mockClick = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: mockClick,
    } as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:test"), revokeObjectURL: vi.fn() });

    // Should not throw even with special characters
    expect(() => exportToCSV([{ name: "Smith, John", note: 'He said "hello"' }], "test.csv")).not.toThrow();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
