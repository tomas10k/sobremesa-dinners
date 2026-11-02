import { describe, expect, it } from "vitest";
import { isValidWeek, monthGrid, selectableWeeks, toISODate } from "@/lib/weeks";

const today = new Date(2026, 10, 2); // Mon 2 Nov 2026

describe("selectableWeeks", () => {
  it("starts with this week's Monday and is all Mondays", () => {
    const weeks = selectableWeeks(new Date(2026, 10, 5)); // a Thursday
    expect(weeks[0]).toBe("2026-11-02");
    expect(weeks.every((w) => new Date(`${w}T00:00:00`).getDay() === 1)).toBe(true);
  });
});

describe("isValidWeek", () => {
  it("accepts upcoming Mondays and rejects other days or far-off weeks", () => {
    expect(isValidWeek("2026-11-16", today)).toBe(true);
    expect(isValidWeek("2026-11-17", today)).toBe(false);
    expect(isValidWeek("2026-10-05", today)).toBe(false);
    expect(isValidWeek("2027-12-06", today)).toBe(false);
    expect(isValidWeek("nope", today)).toBe(false);
  });
});

describe("monthGrid", () => {
  it("covers November 2026 in Monday-first weeks", () => {
    const rows = monthGrid(2026, 10);
    expect(toISODate(rows[0][0])).toBe("2026-10-26");
    expect(toISODate(rows[rows.length - 1][6])).toBe("2026-12-06");
    expect(rows.every((r) => r.length === 7 && r[0].getDay() === 1)).toBe(true);
  });
});
