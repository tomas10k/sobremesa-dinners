import { dictionaries, type Lang } from "@/lib/i18n";

/** What a calendar entry needs. The address is only included once we've sent it. */
export type CalendarDinner = {
  number: number;
  starts_at: string | null;
  city: "berkeley" | "sf" | null;
  venue?: string | null;
};

const DINNER_MS = 2.5 * 60 * 60 * 1000;
const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, "");

function where(e: CalendarDinner, lang: Lang): string {
  return [e.venue, e.city ? dictionaries[lang][e.city] : null].filter(Boolean).join(", ");
}

/** "Add to Google Calendar" link, or null for a dinner without a date. */
export function googleCalendarUrl(e: CalendarDinner, lang: Lang, site: string): string | null {
  if (!e.starts_at) return null;
  const start = Date.parse(e.starts_at);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Sobremesa No. ${e.number}`,
    dates: `${stamp(start)}/${stamp(start + DINNER_MS)}`,
    details: `${site}/cena/${e.number}`,
    location: where(e, lang),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** An .ics file (Apple Calendar, Outlook), or null for a dinner without a date. */
export function icsFile(e: CalendarDinner, lang: Lang, site: string, now = new Date()): string | null {
  if (!e.starts_at) return null;
  const start = Date.parse(e.starts_at);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sobremesa Dinners//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:sobremesa-${e.number}@sobremesadinners.com`,
    `DTSTAMP:${stamp(now.getTime())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(start + DINNER_MS)}`,
    `SUMMARY:${icsText(`Sobremesa No. ${e.number}`)}`,
    `LOCATION:${icsText(where(e, lang))}`,
    `URL:${site}/cena/${e.number}`,
    `DESCRIPTION:${icsText(`${site}/cena/${e.number}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
