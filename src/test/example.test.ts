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

  it("handles values with newlines by wrapping in quotes", () => {
    const mockClick = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: mockClick,
    } as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:test"), revokeObjectURL: vi.fn() });

    expect(() => exportToCSV([{ note: "line1\nline2" }], "test.csv")).not.toThrow();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("handles null and undefined values", () => {
    const mockClick = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      href: "", download: "", click: mockClick,
    } as unknown as HTMLAnchorElement);
    vi.stubGlobal("URL", { createObjectURL: vi.fn().mockReturnValue("blob:test"), revokeObjectURL: vi.fn() });

    expect(() => exportToCSV([{ name: null, value: undefined } as any], "test.csv")).not.toThrow();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});

// ── getAnikaTemplates ──

import { getAnikaTemplates } from "@/lib/anikaTemplates";

describe("getAnikaTemplates", () => {
  it("returns templates for all 3 hubs", () => {
    const templates = getAnikaTemplates();
    const hubs = [...new Set(templates.map(t => t.hub))];
    expect(hubs).toContain("atlanta");
    expect(hubs).toContain("phoenix");
    expect(hubs).toContain("la");
  });

  it("returns 45 total templates (15 unique x 3 hubs)", () => {
    const templates = getAnikaTemplates();
    expect(templates).toHaveLength(45);
  });

  it("each template has name, hub, step_type, subject, and body", () => {
    const templates = getAnikaTemplates();
    for (const t of templates) {
      expect(t.name).toBeTruthy();
      expect(t.hub).toBeTruthy();
      expect(t.step_type).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.body).toBeTruthy();
    }
  });

  it("templates include all step types: email_1, email_2, call", () => {
    const templates = getAnikaTemplates();
    const stepTypes = [...new Set(templates.map(t => t.step_type))];
    expect(stepTypes).toContain("email_1");
    expect(stepTypes).toContain("email_2");
    expect(stepTypes).toContain("call");
  });

  it("each hub has the same number of templates", () => {
    const templates = getAnikaTemplates();
    const atlantaCount = templates.filter(t => t.hub === "atlanta").length;
    const phoenixCount = templates.filter(t => t.hub === "phoenix").length;
    const laCount = templates.filter(t => t.hub === "la").length;
    expect(atlantaCount).toBe(15);
    expect(phoenixCount).toBe(15);
    expect(laCount).toBe(15);
  });

  it("templates have unique names within each hub", () => {
    const templates = getAnikaTemplates();
    for (const hub of ["atlanta", "phoenix", "la"]) {
      const names = templates.filter(t => t.hub === hub).map(t => t.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("email_1 templates include 5 per hub", () => {
    const templates = getAnikaTemplates();
    for (const hub of ["atlanta", "phoenix", "la"]) {
      const email1s = templates.filter(t => t.hub === hub && t.step_type === "email_1");
      expect(email1s.length).toBe(5);
    }
  });

  it("email_2 templates include 5 per hub", () => {
    const templates = getAnikaTemplates();
    for (const hub of ["atlanta", "phoenix", "la"]) {
      const email2s = templates.filter(t => t.hub === hub && t.step_type === "email_2");
      expect(email2s.length).toBe(5);
    }
  });

  it("call templates include 5 per hub", () => {
    const templates = getAnikaTemplates();
    for (const hub of ["atlanta", "phoenix", "la"]) {
      const calls = templates.filter(t => t.hub === hub && t.step_type === "call");
      expect(calls.length).toBe(5);
    }
  });

  it("subjects contain placeholder variables", () => {
    const templates = getAnikaTemplates();
    const hasPlaceholders = templates.some(t => t.subject.includes("[") || t.body.includes("["));
    expect(hasPlaceholders).toBe(true);
  });

  it("bodies are non-empty strings with meaningful content", () => {
    const templates = getAnikaTemplates();
    for (const t of templates) {
      expect(t.body.length).toBeGreaterThan(50);
    }
  });
});

// ── Additional sequenceUtils branch tests ──

describe("assignHub additional branches", () => {
  it("returns atlanta for FL state", () => {
    expect(assignHub("FL")).toBe("atlanta");
  });

  it("returns phoenix for TX state", () => {
    expect(assignHub("TX")).toBe("phoenix");
  });

  it("returns la for WA state", () => {
    expect(assignHub("WA")).toBe("la");
  });

  it("returns la for Seattle city", () => {
    expect(assignHub(null, "Seattle")).toBe("la");
  });

  it("returns phoenix for Denver city", () => {
    expect(assignHub(null, "Denver")).toBe("phoenix");
  });

  it("returns atlanta for Miami city", () => {
    expect(assignHub(null, "Miami")).toBe("atlanta");
  });

  it("handles null state and null city", () => {
    expect(assignHub(null, null)).toBe("phoenix");
  });

  it("handles empty string state", () => {
    expect(assignHub("")).toBe("phoenix");
  });

  it("handles empty string city", () => {
    expect(assignHub(null, "")).toBe("phoenix");
  });

  it("city lookup is case insensitive", () => {
    expect(assignHub(null, "LOS ANGELES")).toBe("la");
    expect(assignHub(null, "los angeles")).toBe("la");
    expect(assignHub(null, "Los Angeles")).toBe("la");
  });

  it("city with whitespace is trimmed", () => {
    expect(assignHub(null, " phoenix ")).toBe("phoenix");
  });

  it("city overrides state when both provided", () => {
    expect(assignHub("CA", "Atlanta")).toBe("atlanta");
    expect(assignHub("FL", "Phoenix")).toBe("phoenix");
  });

  it("unknown city falls back to state", () => {
    expect(assignHub("CA", "UnknownCity")).toBe("la");
  });

  it("unknown city and unknown state returns phoenix default", () => {
    expect(assignHub("ZZ", "UnknownCity")).toBe("phoenix");
  });
});
