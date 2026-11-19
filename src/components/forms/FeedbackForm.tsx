"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Chips, Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { venmoLink } from "@/lib/emails/render";
import type { Guest } from "@/lib/guests";

const SCALE = ["1", "2", "3", "4", "5"] as const;
const COME_BACK = ["yes", "maybe", "no"] as const;
const TEXTS = ["more_of", "less_of", "improve", "refer", "highlight"] as const;

/** A saved answer as the chip value it matches, if any. */
const pick = <T extends string>(options: readonly T[], saved: unknown): T[] =>
  options.filter((o) => o === String(saved ?? ""));

/** After the dinner, from the thank-you email. Answering again updates the same feedback. */
export function FeedbackForm({ guest }: { guest: Guest }) {
  const { t } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/feedback");
  const prev = guest.feedback ?? {};
  const [overall, setOverall] = useState(pick(SCALE, prev.overall));
  const [food, setFood] = useState(pick(SCALE, prev.food));
  const [comeBack, setComeBack] = useState(pick(COME_BACK, prev.come_back));
  const [texts, setTexts] = useState(() => Object.fromEntries(TEXTS.map((k) => [k, String(prev[k] ?? "")])) as Record<(typeof TEXTS)[number], string>);
  const [quoteOk, setQuoteOk] = useState(Boolean(prev.quote_ok));
  const [website, setWebsite] = useState("");
  const [missing, setMissing] = useState(false);
  const ev = guest.event;
  const title = `${t.fbTitle} ${guest.firstName}`.trim();
  const labels = { more_of: t.fbMore, less_of: t.fbLess, improve: t.fbImprove, refer: t.fbRefer, highlight: t.fbHighlight };

  const whatsapp = ev.whatsapp_url && (
    <div className="cost">
      <p className="body">{t.fbWhatsapp}</p>
      <a className="btn label pay" href={ev.whatsapp_url} target="_blank" rel="noopener noreferrer">{t.fbWhatsappButton}</a>
    </div>
  );

  if (state === "done") {
    return (
      <FormPage title={title} lede={t.fbLede}>
        <p className="done body">{t.fbDone}</p>
        {whatsapp}
      </FormPage>
    );
  }

  return (
    <FormPage title={title} lede={t.fbLede}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!overall[0]) return setMissing(true);
          submit({
            code: guest.code,
            overall: Number(overall[0]),
            food: food[0] ? Number(food[0]) : undefined,
            come_back: comeBack[0],
            ...texts,
            quote_ok: quoteOk,
            website,
          });
        }}
      >
        <Honeypot value={website} onChange={setWebsite} />

        {guest.type === "student" && !guest.paid && ev.venmo_handle && ev.price_usd !== null && (
          <div className="cost">
            <span className="label soft">{t.cfPay}</span>
            <p className="body">{t.fbUnpaid} ${ev.price_usd} USD · @{ev.venmo_handle}</p>
            <a className="btn label pay" href={venmoLink(ev.venmo_handle, ev.price_usd, `Sobremesa No. ${ev.number}`)} target="_blank" rel="noopener noreferrer">
              {t.cfPayButton}
            </a>
          </div>
        )}

        <fieldset>
          <Field label={`${t.fbOverall} (${t.fbScale})`} name="overall" errors={missing ? { ...errors, overall: t.required } : errors} group>
            <Chips name="overall" options={SCALE} value={overall} onChange={(v) => { setOverall(v); setMissing(false); }} labels={(n) => n} />
          </Field>
          <Field label={t.fbFood} name="food" errors={errors} group optional>
            <Chips name="food" options={SCALE} value={food} onChange={setFood} labels={(n) => n} />
          </Field>
          <Field label={t.fbComeBack} name="come_back" errors={errors} group optional>
            <Chips name="come_back" options={COME_BACK} value={comeBack} onChange={setComeBack}
              labels={(c) => ({ yes: t.fbYes, maybe: t.fbMaybe, no: t.fbNo })[c]} />
          </Field>
        </fieldset>

        <fieldset>
          {TEXTS.map((k) => (
            <Field key={k} label={labels[k]} name={k} errors={errors} optional>
              <input className="input" value={texts[k]} maxLength={k === "highlight" ? 400 : 1000}
                onChange={(e) => setTexts({ ...texts, [k]: e.target.value })} />
            </Field>
          ))}
          <label className="check body">
            <input type="checkbox" checked={quoteOk} onChange={(e) => setQuoteOk(e.target.checked)} />
            <span>{t.fbQuote}</span>
          </label>
        </fieldset>

        <SubmitRow state={state} formError={formError} />
        {whatsapp}
      </form>
    </FormPage>
  );
}
