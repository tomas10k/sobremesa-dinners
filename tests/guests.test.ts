import { describe, expect, it } from "vitest";
import { confirmSeatSchema, feedbackSchema } from "@/lib/schemas";

const code = "0123456789abcdef";

describe("feedbackSchema", () => {
  it("needs only the overall rating", () => {
    expect(feedbackSchema.safeParse({ code, overall: 5 }).success).toBe(true);
    expect(feedbackSchema.safeParse({ code }).success).toBe(false);
  });
  it("keeps ratings between 1 and 5", () => {
    expect(feedbackSchema.safeParse({ code, overall: 6 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ code, overall: 4, food: 0 }).success).toBe(false);
  });
  it("turns blank answers into nothing", () => {
    const r = feedbackSchema.parse({ code, overall: 4, more_of: "  ", less_of: "Menos ruido" });
    expect(r.more_of).toBeUndefined();
    expect(r.less_of).toBe("Menos ruido");
    expect(r.quote_ok).toBe(false);
  });
});

describe("confirmSeatSchema", () => {
  it("accepts a confirmation with or without dietary needs", () => {
    expect(confirmSeatSchema.safeParse({ code }).success).toBe(true);
    expect(confirmSeatSchema.parse({ code, dietary: "Vegetariana" }).dietary).toBe("Vegetariana");
  });
  it("rejects bad codes and bots", () => {
    expect(confirmSeatSchema.safeParse({ code: "x" }).success).toBe(false);
    expect(confirmSeatSchema.safeParse({ code, website: "spam" }).success).toBe(false);
  });
});

