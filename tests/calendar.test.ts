import { describe, expect, it } from "vitest";
import { googleCalendarUrl, icsFile } from "@/lib/calendar";

const SITE = "https://www.sobremesadinners.com";
const dinner = { number: 2, starts_at: "2026-12-04T03:00:00.000Z", city: "sf" as const };

describe("calendar", () => {
  it("builds a Google Calendar link for 2.5 hours, without the address", () => {
    const url = new URL(googleCalendarUrl(dinner, "en", SITE)!);
    expect(url.searchParams.get("text")).toBe("Sobremesa No. 2");
    expect(url.searchParams.get("dates")).toBe("20261204T030000Z/20261204T053000Z");
    expect(url.searchParams.get("location")).toBe("San Francisco");
  });
  it("builds an .ics file that Apple Calendar and Outlook accept", () => {
    const ics = icsFile(dinner, "es", SITE, new Date("2026-11-27T00:00:00Z"))!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261204T030000Z");
    expect(ics).toContain("UID:sobremesa-2@sobremesadinners.com");
    expect(ics).toContain(`URL:${SITE}/cena/2`);
  });
  it("has nothing for a dinner without a date", () => {
    expect(googleCalendarUrl({ ...dinner, starts_at: null }, "es", SITE)).toBeNull();
    expect(icsFile({ ...dinner, starts_at: null }, "es", SITE)).toBeNull();
  });
});
