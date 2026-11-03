// Dinners happen in the Bay Area, so admins enter and read times in Pacific time
// regardless of where their laptop thinks it is.

export const TZ = "America/Los_Angeles";

function wallClock(d: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  return Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)]));
}

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in Pacific time (for <input type="datetime-local">). */
export function isoToPacificInput(iso: string | null): string {
  if (!iso) return "";
  const w = wallClock(new Date(iso));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${p(w.month)}-${p(w.day)}T${p(w.hour)}:${p(w.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" read as Pacific time → ISO timestamp. */
export function pacificInputToISO(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Start from the UTC reading and correct by the Pacific offset (twice, for DST edges).
  let t = target;
  for (let i = 0; i < 2; i++) {
    const w = wallClock(new Date(t));
    t += target - Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  }
  return new Date(t).toISOString();
}

export function formatPacific(iso: string | null): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(new Date(iso));
}
