// Weeks are identified by their Monday, as a plain "YYYY-MM-DD" string (no time zone).

export const MAX_WEEKS_AHEAD = 26;

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return toISODate(d) === s ? d : null;
}

export function mondayOf(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Mondays from this week through `MAX_WEEKS_AHEAD` weeks out: the weeks a speaker can pick. */
export function selectableWeeks(today: Date): string[] {
  const first = mondayOf(today);
  return Array.from({ length: MAX_WEEKS_AHEAD + 1 }, (_, i) => toISODate(addDays(first, i * 7)));
}

/** True if `s` is a Monday no earlier than last week and within the selectable range. */
export function isValidWeek(s: string, today: Date): boolean {
  const d = parseISODate(s);
  if (!d || d.getDay() !== 1) return false;
  const earliest = addDays(mondayOf(today), -7); // allow a day of time-zone slack
  const latest = addDays(mondayOf(today), MAX_WEEKS_AHEAD * 7);
  return d >= earliest && d <= latest;
}

/** The Monday-first weeks (rows of 7 dates) that cover a month. */
export function monthGrid(year: number, month: number): Date[][] {
  const start = mondayOf(new Date(year, month, 1));
  const rows: Date[][] = [];
  for (let w = start; w.getMonth() === month || w < new Date(year, month, 1); w = addDays(w, 7)) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
    if (rows.length > 6) break;
  }
  return rows;
}
