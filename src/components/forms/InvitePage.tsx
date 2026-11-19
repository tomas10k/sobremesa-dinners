"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Chips, Field, FormPage, Honeypot, SubmitRow, useSubmit } from "./kit";
import { formatDay } from "@/lib/i18n";
import type { PublicInvite } from "@/lib/invites";

const NONE = "none";

export function InvitePage({ invite }: { invite: PublicInvite }) {
  const { t, lang } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/invites");
  const [choice, setChoice] = useState<string[]>(
    invite.response === "accepted" && invite.chosen_date ? [invite.chosen_date]
    : invite.response === "declined" ? [NONE]
    : [],
  );
  const [message, setMessage] = useState(invite.message ?? "");
  const [website, setWebsite] = useState("");
  const [missing, setMissing] = useState(false);
  const fieldErrors = missing ? { ...errors, date: t.required } : errors;

  const title = invite.firstName ? `${t.invHello} ${invite.firstName},` : `${t.invHello},`;
  const ev = invite.event;

  if (state === "done") {
    return (
      <FormPage title={title} lede={t.invLede}>
        <p className="done body">{choice[0] === NONE ? t.invDoneNo : t.invDoneYes}</p>
      </FormPage>
    );
  }

  return (
    <FormPage title={title} lede={t.invLede}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!choice[0]) return setMissing(true);
          submit({ code: invite.code, date: choice[0] === NONE ? null : choice[0], message, website });
        }}
      >
        <Honeypot value={website} onChange={setWebsite} />

        {ev && (
          <div className="cost">
            <span className="label soft">{t.invDinner}</span>
            <p className="body">No. {ev.number} — {lang === "es" ? ev.title_es : ev.title_en}</p>
            {ev.city && <span className="label soft">{t[ev.city]}</span>}
            {(ev.description_es || ev.description_en) && (
              <p className="body soft">{(lang === "es" ? ev.description_es : ev.description_en) || ev.description_es}</p>
            )}
          </div>
        )}

        <fieldset>
          {invite.response !== "pending" && <p className="hint soft">{t.invAnswered}</p>}
          <Field label={t.invWhen} name="date" errors={fieldErrors} group>
            <Chips
              name="date"
              options={[...invite.dates, NONE]}
              value={choice}
              onChange={(v) => {
                setChoice(v);
                setMissing(false);
              }}
              labels={(d) => (d === NONE ? t.invNone : formatDay(d, lang))}
            />
          </Field>
          <Field label={t.invMessage} name="message" errors={fieldErrors} optional>
            <textarea className="input" rows={4} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
        </fieldset>

        <SubmitRow state={state} formError={formError} />
      </form>
    </FormPage>
  );
}
