"use client";

import { useState, useSyncExternalStore } from "react";
import { useLang } from "../LangProvider";
import { monthGrid, selectableWeeks, toISODate } from "@/lib/weeks";

const noop = () => () => {};

const DAY_HEADERS = { es: ["L", "M", "M", "J", "V", "S", "D"], en: ["M", "T", "W", "T", "F", "S", "S"] };

/** Month calendars where each row is a week; tapping a row selects that week (by its Monday). */
export function WeekCalendar({ value, onChange }: { value: string[]; onChange: (weeks: string[]) => void }) {
  const { t, lang } = useLang();
  const [offset, setOffset] = useState(0);
  // "Today" comes from the visitor's clock, so the calendar only renders in the browser.
  const inBrowser = useSyncExternalStore(noop, () => true, () => false);
  if (!inBrowser) return <div className="cal-placeholder" />;
  const today = new Date();

  const weeks = selectableWeeks(today);
  const allowed = new Set(weeks);
  const last = new Date(`${weeks[weeks.length - 1]}T00:00:00`);
  const maxOffset = (last.getFullYear() - today.getFullYear()) * 12 + last.getMonth() - today.getMonth() - 1;
  const months = [0, 1].map((i) => new Date(today.getFullYear(), today.getMonth() + offset + i, 1));
  const monthName = new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { month: "long", year: "numeric" });

  const toggle = (monday: string) =>
    onChange(value.includes(monday) ? value.filter((w) => w !== monday) : [...value, monday].sort());

  return (
    <div className="cal">
      <div className="cal-nav">
        <button type="button" className="btn-text label" onClick={() => setOffset(offset - 1)} disabled={offset === 0} aria-label={t.prevMonth}>←</button>
        <span className="label soft">{value.length} {t.weeksChosen}</span>
        <button type="button" className="btn-text label" onClick={() => setOffset(offset + 1)} disabled={offset >= maxOffset} aria-label={t.nextMonth}>→</button>
      </div>
      <div className="cal-months">
        {months.map((m) => (
          <div className="cal-month" key={m.toISOString()}>
            <div className="cal-title meta-lg">{monthName.format(m)}</div>
            <div className="cal-row cal-head label soft" aria-hidden="true">
              {DAY_HEADERS[lang].map((d, i) => <span key={i}>{d}</span>)}
            </div>
            {monthGrid(m.getFullYear(), m.getMonth()).map((row) => {
              const monday = toISODate(row[0]);
              const enabled = allowed.has(monday);
              const on = value.includes(monday);
              return (
                <button
                  type="button"
                  key={monday}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={`${new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" }).format(row[0])} – ${new Intl.DateTimeFormat(lang, { day: "numeric", month: "long" }).format(row[6])}`}
                  disabled={!enabled}
                  className={`cal-row cal-week ${on ? "on" : ""}`}
                  onClick={() => toggle(monday)}
                >
                  {row.map((d) => (
                    <span key={d.getDate()} className={d.getMonth() === m.getMonth() ? "" : "out"}>{d.getDate()}</span>
                  ))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
