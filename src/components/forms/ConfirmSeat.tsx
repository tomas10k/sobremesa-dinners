"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { googleCalendarUrl } from "@/lib/calendar";
import { formatEventDate } from "@/lib/i18n";
import { paymentOf, venmoLink } from "@/lib/emails/render";
import { SITE_URL } from "@/lib/site";
import type { Guest } from "@/lib/guests";

/**
 * From the "you're in" email: one tap confirms the seat (and tells the admins),
 * then the dinner goes on their calendar. Payment details stay visible until they've paid.
 */
export function ConfirmSeat({ guest }: { guest: Guest }) {
  const { t } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/confirm");
  const [dietary, setDietary] = useState(guest.dietary ?? "");
  const [website, setWebsite] = useState("");
  const title = `${t.cfTitle}, ${guest.firstName}`;

  if (!["accepted", "confirmed"].includes(guest.status ?? "")) {
    return <FormPage title={title} lede={t.cfLede}><p className="done body">{t.cfClosed}</p></FormPage>;
  }
  if (state === "done") {
    return (
      <FormPage title={title} lede={t.cfLede}>
        <p className="done body">{t.cfDone}</p>
        <Calendar guest={guest} />
        <Payment guest={guest} />
      </FormPage>
    );
  }

  return (
    <FormPage title={title} lede={t.cfLede}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit({ code: guest.code, dietary, website });
        }}
      >
        <Honeypot value={website} onChange={setWebsite} />
        <EventBox guest={guest} />
        <Payment guest={guest} />
        <fieldset>
          {guest.seatConfirmed && <p className="hint soft">{t.cfAlready}</p>}
          <Field label={t.cfDietary} name="dietary" errors={errors} optional>
            <input className="input" value={dietary} maxLength={200} onChange={(e) => setDietary(e.target.value)} />
          </Field>
        </fieldset>
        <SubmitRow state={state} formError={formError} label={t.cfSend} />
        {guest.seatConfirmed && <Calendar guest={guest} />}
      </form>
    </FormPage>
  );
}

function Calendar({ guest }: { guest: Guest }) {
  const { t, lang } = useLang();
  const google = googleCalendarUrl(guest.event, lang, SITE_URL);
  if (!google) return null;
  return (
    <div className="cost">
      <span className="label soft">{t.cfCalendar}</span>
      <div className="cal-buttons">
        <a className="btn label pay" href={google} target="_blank" rel="noopener noreferrer">Google Calendar</a>
        <a className="btn label pay" href={`/api/calendar/${guest.code}?lang=${lang}`}>Apple / Outlook</a>
      </div>
    </div>
  );
}

function Payment({ guest }: { guest: Guest }) {
  const { t } = useLang();
  const ev = guest.event;
  const pay = paymentOf(ev);
  if (!pay) return null;
  const note = `Sobremesa No. ${ev.number}`;
  return (
    <div className="cost">
      <span className="label soft">{t.cfPay}</span>
      {guest.paid ? (
        <p className="body">{t.cfPaid}</p>
      ) : pay.method === "Zelle" ? (
        <p className="body">${pay.price} USD · Zelle: <strong>{pay.to}</strong> · “{note}”</p>
      ) : (
        <>
          <p className="body">${pay.price} USD · @{pay.to} · “{note}”</p>
          <a className="btn label pay" href={venmoLink(pay.to, pay.price, note)} target="_blank" rel="noopener noreferrer">
            {t.cfPayButton}
          </a>
        </>
      )}
    </div>
  );
}

function EventBox({ guest }: { guest: Guest }) {
  const { t, lang } = useLang();
  const ev = guest.event;
  const when = [formatEventDate(ev.starts_at, lang), ev.city && t[ev.city]].filter(Boolean).join(" · ");
  return (
    <div className="cost">
      <span className="label soft">{t.invDinner}</span>
      <p className="body">No. {ev.number} — {lang === "es" ? ev.title_es : ev.title_en}</p>
      {when && <span className="label soft">{when}</span>}
    </div>
  );
}
