"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Chips, Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { WeekCalendar } from "./WeekCalendar";
import { CITIES, INDUSTRIES, MOTIVATIONS, SEAT_ANSWERS, WEEKDAYS } from "@/lib/schemas";
import { formatEventDate } from "@/lib/i18n";
import type { PublicEvent } from "@/lib/events";

type Referral = { name: string; linkedin_url: string; reason: string };
const emptyReferral = (): Referral => ({ name: "", linkedin_url: "", reason: "" });

/** With `event`, it's the short version for joining that dinner: no availability questions. */
export function SpeakerForm({ openEvents, event }: { openEvents: PublicEvent[]; event?: PublicEvent }) {
  const { t, lang } = useLang();
  const title = event ? t.joinTitle : t.spTitle;
  const lede = event ? t.joinLede : t.spLede;
  const { state, errors, formError, submit } = useSubmit("/api/speakers");

  const [f, setF] = useState({
    name: "", email: "", linkedin_url: "", company: "", role: "", industry: "",
    motivation_other: "", dietary: "", roots: "", heard_from: "", website: "",
  });
  const [weekdays, setWeekdays] = useState<(typeof WEEKDAYS)[number][]>([]);
  const [cities, setCities] = useState<(typeof CITIES)[number][]>([]);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [motivations, setMotivations] = useState<(typeof MOTIVATIONS)[number][]>([]);
  const [seats, setSeats] = useState<Record<string, (typeof SEAT_ANSWERS)[number] | undefined>>({});
  const [referrals, setReferrals] = useState<Referral[]>([emptyReferral()]);
  const [flags, setFlags] = useState({ can_host: false, can_sponsor: false, hiring: false });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  if (state === "done") {
    return <FormPage title={title} lede={lede}><p className="done body">{event ? t.joinDone : t.spDone}</p></FormPage>;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const shared = { ...f, motivations, ...flags, lang, referrals: referrals.filter((r) => r.name.trim()) };
    submit(
      event
        ? { ...shared, event_id: event.id }
        : {
            ...shared,
            weekdays,
            weeks,
            cities,
            seats: Object.entries(seats).flatMap(([event_id, answer]) => (answer ? [{ event_id, answer }] : [])),
          },
    );
  }

  return (
    <FormPage title={title} lede={lede}>
      <form className="form" onSubmit={onSubmit} noValidate>
        <Honeypot value={f.website} onChange={(v) => setF({ ...f, website: v })} />

        {event && (
          <div className="cost">
            <span className="label soft">{t.fEvent}</span>
            <p className="body">No. {event.number} — {lang === "es" ? event.title_es : event.title_en}</p>
            <span className="label soft">
              {[formatEventDate(event.starts_at, lang) ?? t.tbd, event.city && t[event.city]].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}

        <fieldset>
          <legend className="meta-lg">{t.spAbout}</legend>
          <div className="grid2">
            <Field label={t.fName} name="name" errors={errors}>
              <input className="input" value={f.name} onChange={set("name")} autoComplete="name" required />
            </Field>
            <Field label={t.fEmail} name="email" errors={errors}>
              <input className="input" type="email" value={f.email} onChange={set("email")} autoComplete="email" required />
            </Field>
            <Field label={t.fLinkedin} name="linkedin_url" errors={errors}>
              <input className="input" value={f.linkedin_url} onChange={set("linkedin_url")} placeholder={t.fLinkedinHint} required />
            </Field>
            <Field label={t.fIndustry} name="industry" errors={errors}>
              <select className="input" value={f.industry} onChange={set("industry")} required>
                <option value="" disabled>{t.choose}</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{t[`ind_${i}`]}</option>)}
              </select>
            </Field>
            <Field label={t.fCompany} name="company" errors={errors}>
              <input className="input" value={f.company} onChange={set("company")} autoComplete="organization" required />
            </Field>
            <Field label={t.fRole} name="role" errors={errors}>
              <input className="input" value={f.role} onChange={set("role")} autoComplete="organization-title" required />
            </Field>
          </div>
        </fieldset>

        {!event && (
          <fieldset>
            <legend className="meta-lg">{t.spWhen}</legend>
            <Field label={t.fWeekdays} name="weekdays" errors={errors} group>
              <Chips name="weekdays" multiple options={WEEKDAYS} value={weekdays} onChange={setWeekdays} labels={(d) => t[d]} />
            </Field>
            <Field label={t.fWeeks} name="weeks" errors={errors} group>
              <p className="hint soft">{t.fWeeksHint}</p>
              <WeekCalendar value={weeks} onChange={setWeeks} />
            </Field>
            <Field label={t.fCities} name="cities" errors={errors} group>
              <Chips name="cities" multiple options={CITIES} value={cities} onChange={setCities} labels={(c) => t[c]} />
            </Field>
          </fieldset>
        )}

        <fieldset>
          <legend className="meta-lg">{t.spWhy}</legend>
          <Field label={t.spWhyHint} name="motivations" errors={errors} group>
            {MOTIVATIONS.map((m) => (
              <label className="check body" key={m}>
                <input
                  type="checkbox"
                  checked={motivations.includes(m)}
                  onChange={() =>
                    setMotivations(motivations.includes(m) ? motivations.filter((x) => x !== m) : [...motivations, m])
                  }
                />
                <span>{t[m]}</span>
              </label>
            ))}
          </Field>
          {motivations.includes("other") && (
            <Field label={t.fOtherWhy} name="motivation_other" errors={errors}>
              <input className="input" value={f.motivation_other} onChange={set("motivation_other")} />
            </Field>
          )}
        </fieldset>

        {!event && openEvents.length > 0 && (
          <fieldset>
            <legend className="meta-lg">{t.spSeats}</legend>
            <p className="lede body soft">{t.spSeatsLede}</p>
            <div>
              {openEvents.map((ev) => {
                const date = formatEventDate(ev.starts_at, lang) ?? t.tbd;
                const city = ev.city ? ` · ${t[ev.city]}` : "";
                const answer = seats[ev.id];
                return (
                  <div className="seat" key={ev.id}>
                    <div>
                      <div className="body">No. {ev.number} — {lang === "es" ? ev.title_es : ev.title_en}</div>
                      <div className="label soft">{date}{city}</div>
                    </div>
                    <Chips
                      name={`seat-${ev.id}`}
                      multiple
                      options={SEAT_ANSWERS}
                      value={answer ? [answer] : []}
                      // Checkbox behavior so a second click clears the answer; only one stays selected.
                      onChange={(v) => setSeats({ ...seats, [ev.id]: v.find((x) => x !== answer) })}
                      labels={(a) => t[a]}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="meta-lg">{t.spRefer}</legend>
          <p className="lede body soft">{t.spReferLede}</p>
          <div>
            {referrals.map((r, i) => {
              const upd = (k: keyof Referral) => (e: React.ChangeEvent<HTMLInputElement>) =>
                setReferrals(referrals.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
              return (
                <div className="repeat" key={i}>
                  <div className="grid2">
                    <Field label={t.fName} name={`referrals.${i}.name`} errors={errors} optional>
                      <input className="input" value={r.name} onChange={upd("name")} />
                    </Field>
                    <Field label={t.fLinkedin} name={`referrals.${i}.linkedin_url`} errors={errors} optional>
                      <input className="input" value={r.linkedin_url} onChange={upd("linkedin_url")} placeholder={t.fLinkedinHint} />
                    </Field>
                  </div>
                  <Field label={t.fWhy} name={`referrals.${i}.reason`} errors={errors} optional>
                    <input className="input" value={r.reason} onChange={upd("reason")} />
                  </Field>
                  {referrals.length > 1 && (
                    <button type="button" className="btn-text label" onClick={() => setReferrals(referrals.filter((_, j) => j !== i))}>
                      {t.remove}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {referrals.length < 10 && (
            <button type="button" className="btn-text label" onClick={() => setReferrals([...referrals, emptyReferral()])}>
              {t.addAnother}
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend className="meta-lg">{t.spExtras} <span className="soft">· {t.optional}</span></legend>
          {(["can_host", "can_sponsor", "hiring"] as const).map((k) => {
            const label = { can_host: t.fCanHost, can_sponsor: t.fCanSponsor, hiring: t.fHiring }[k];
            return (
              <label className="check body" key={k}>
                <input type="checkbox" checked={flags[k]} onChange={(e) => setFlags({ ...flags, [k]: e.target.checked })} />
                <span>{label}</span>
              </label>
            );
          })}
          <div className="grid2">
            <Field label={t.fDietary} name="dietary" errors={errors} optional>
              <input className="input" value={f.dietary} onChange={set("dietary")} />
            </Field>
            <Field label={t.fRoots} name="roots" errors={errors} optional>
              <input className="input" value={f.roots} onChange={set("roots")} />
            </Field>
          </div>
          <Field label={t.fHeard} name="heard_from" errors={errors} optional>
            <input className="input" value={f.heard_from} onChange={set("heard_from")} />
          </Field>
        </fieldset>

        <SubmitRow state={state} formError={formError} />
      </form>
    </FormPage>
  );
}
