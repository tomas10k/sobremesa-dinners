"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { formatEventDate } from "@/lib/i18n";
import { venmoLink } from "@/lib/emails/render";
import type { Guest } from "@/lib/guests";

/** From the "you're in" email: pay, tell us about dietary needs, confirm. */
export function ConfirmSeat({ guest }: { guest: Guest }) {
  const { t } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/confirm");
  const [dietary, setDietary] = useState(guest.dietary ?? "");
  const [website, setWebsite] = useState("");
  const ev = guest.event;
  const title = `${t.cfTitle}, ${guest.firstName}`;

  if (!["accepted", "confirmed"].includes(guest.status ?? "")) {
    return <FormPage title={title} lede={t.cfLede}><p className="done body">{t.cfClosed}</p></FormPage>;
  }
  if (state === "done") {
    return <FormPage title={title} lede={t.cfLede}><p className="done body">{t.cfDone}</p></FormPage>;
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

        {ev.venmo_handle && ev.price_usd !== null && (
          <div className="cost">
            <span className="label soft">{t.cfPay}</span>
            {guest.paid ? (
              <p className="body">{t.cfPaid}</p>
            ) : (
              <>
                <p className="body">${ev.price_usd} USD · @{ev.venmo_handle} · “Sobremesa No. {ev.number}”</p>
                <a className="btn label pay" href={venmoLink(ev.venmo_handle, ev.price_usd, `Sobremesa No. ${ev.number}`)} target="_blank" rel="noopener noreferrer">
                  {t.cfPayButton}
                </a>
              </>
            )}
          </div>
        )}

        <fieldset>
          {guest.seatConfirmed && <p className="hint soft">{t.cfAlready}</p>}
          <Field label={t.cfDietary} name="dietary" errors={errors} optional>
            <input className="input" value={dietary} maxLength={200} onChange={(e) => setDietary(e.target.value)} />
          </Field>
        </fieldset>
        <SubmitRow state={state} formError={formError} label={t.cfSend} />
      </form>
    </FormPage>
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
