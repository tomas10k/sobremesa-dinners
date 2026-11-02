"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Chips, Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { YEARS } from "@/lib/schemas";
import { countWords, ESSAY_MAX_WORDS, limitWords } from "@/lib/words";
import { formatEventDate } from "@/lib/i18n";
import type { PublicEvent } from "@/lib/events";

export function StudentForm({ events, preselect }: { events: PublicEvent[]; preselect?: string }) {
  const { t, lang } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/students");

  const initialEvent = events.find((e) => String(e.number) === preselect)?.id ?? (events.length === 1 ? events[0].id : "");
  const [f, setF] = useState({
    event_id: initialEvent, name: "", email: "", linkedin_url: "", university: "", program: "", essay: "", website: "",
  });
  const [year, setYear] = useState<(typeof YEARS)[number][]>([]);
  const words = countWords(f.essay);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  if (state === "done") {
    return <FormPage title={t.stTitle} lede={t.stLede}><p className="done body">{t.stDone}</p></FormPage>;
  }
  if (events.length === 0) {
    return <FormPage title={t.stTitle} lede={t.stLede}><p className="done body">{t.stNoneOpen}</p></FormPage>;
  }

  return (
    <FormPage title={t.stTitle} lede={t.stLede}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit({ ...f, year: year[0] ?? "", lang });
        }}
      >
        <Honeypot value={f.website} onChange={(v) => setF({ ...f, website: v })} />

        <fieldset>
          <Field label={t.fEvent} name="event_id" errors={errors}>
            <select className="input" value={f.event_id} onChange={set("event_id")} required>
              <option value="" disabled>{t.choose}</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  No. {ev.number} — {lang === "es" ? ev.title_es : ev.title_en}
                  {ev.starts_at ? ` · ${formatEventDate(ev.starts_at, lang)}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <div className="cost">
            <span className="label soft">{t.stCostLabel}</span>
            <p className="body">{t.stCost}</p>
          </div>
        </fieldset>

        <fieldset>
          <div className="grid2">
            <Field label={t.fName} name="name" errors={errors}>
              <input className="input" value={f.name} onChange={set("name")} autoComplete="name" required />
            </Field>
            <Field label={t.fEmail} name="email" errors={errors}>
              <input className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
            </Field>
            <Field label={t.fUniversity} name="university" errors={errors}>
              <input className="input" value={f.university} onChange={set("university")} placeholder="UC Berkeley Haas" required />
            </Field>
            <Field label={t.fProgram} name="program" errors={errors}>
              <input className="input" value={f.program} onChange={set("program")} placeholder={t.fProgramHint} required />
            </Field>
            <Field label={t.fYear} name="year" errors={errors} group>
              <Chips name="year" options={YEARS} value={year} onChange={setYear} labels={(y) => (y === "1" ? t.year1 : t.year2)} />
            </Field>
            <Field label={t.fLinkedin} name="linkedin_url" errors={errors} optional>
              <input className="input" value={f.linkedin_url} onChange={set("linkedin_url")} placeholder={t.fLinkedinHint} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <Field label={t.fEssay} name="essay" errors={errors}>
            <textarea
              className="input"
              value={f.essay}
              // Hard stop: anything past the limit, typed or pasted, is cut off.
              onChange={(e) => setF({ ...f, essay: limitWords(e.target.value, ESSAY_MAX_WORDS) })}
              required
            />
            <span className={`counter label ${words >= ESSAY_MAX_WORDS ? "full" : ""}`}>
              {words} / {ESSAY_MAX_WORDS} {t.words}
            </span>
          </Field>
        </fieldset>

        <SubmitRow state={state} formError={formError} />
      </form>
    </FormPage>
  );
}
