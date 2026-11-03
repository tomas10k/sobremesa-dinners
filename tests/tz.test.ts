import { describe, expect, it } from "vitest";
import { isoToPacificInput, pacificInputToISO } from "@/lib/tz";

describe("Pacific time inputs", () => {
  it("reads 7 pm on Nov 17 as Pacific standard time", () => {
    expect(pacificInputToISO("2026-11-17T19:00")).toBe("2026-11-18T03:00:00.000Z");
  });
  it("handles daylight saving time", () => {
    expect(pacificInputToISO("2026-07-14T19:00")).toBe("2026-07-15T02:00:00.000Z");
  });
  it("round-trips back to the same wall-clock time", () => {
    for (const local of ["2026-11-17T19:00", "2027-03-09T19:30", "2026-12-31T23:45"]) {
      expect(isoToPacificInput(pacificInputToISO(local))).toBe(local);
    }
  });
  it("rejects malformed input", () => {
    expect(pacificInputToISO("17/11/2026 7pm")).toBeNull();
    expect(isoToPacificInput(null)).toBe("");
  });
});
