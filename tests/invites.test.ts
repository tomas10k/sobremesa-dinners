import { describe, expect, it } from "vitest";
import { formatDay } from "@/lib/i18n";
import { inviteAnswerSchema } from "@/lib/schemas";

const code = "0123456789abcdef";

describe("inviteAnswerSchema", () => {
  it("accepts a date or an explicit none", () => {
    expect(inviteAnswerSchema.safeParse({ code, date: "2026-12-09" }).success).toBe(true);
    expect(inviteAnswerSchema.safeParse({ code, date: null, message: "Viajo en diciembre" }).success).toBe(true);
  });
  it("requires choosing: a missing date is not the same as none", () => {
    expect(inviteAnswerSchema.safeParse({ code }).success).toBe(false);
  });
  it("rejects malformed codes and dates", () => {
    expect(inviteAnswerSchema.safeParse({ code: "../../admin", date: null }).success).toBe(false);
    expect(inviteAnswerSchema.safeParse({ code, date: "9 dic" }).success).toBe(false);
  });
  it("rejects bots that fill the honeypot", () => {
    expect(inviteAnswerSchema.safeParse({ code, date: null, website: "x" }).success).toBe(false);
  });
});

describe("formatDay", () => {
  it("shows the same calendar day in any time zone", () => {
    expect(formatDay("2026-12-09", "es")).toBe("miércoles, 9 de diciembre");
    expect(formatDay("2026-12-09", "en")).toBe("Wednesday, December 9");
  });
});
