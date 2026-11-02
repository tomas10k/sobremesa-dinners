"use client";

import { useState } from "react";
import { useLang } from "../LangProvider";
import { Chips, Field, FormPage, Honeypot, SubmitRow, useSubmit, type FieldErrors } from "./kit";
import { PROPOSAL_KINDS } from "@/lib/schemas";

type Speaker = { name: string; company: string; role: string; linkedin_url: string; reason: string };
type Topic = { title: string; description: string };
const emptySpeaker = (): Speaker => ({ name: "", company: "", role: "", linkedin_url: "", reason: "" });
const emptyTopic = (): Topic => ({ title: "", description: "" });

export function ProposalForm() {
  const { t } = useLang();
  const { state, errors, formError, submit } = useSubmit("/api/proposals");

  const [f, setF] = useState({ name: "", email: "", website: "" });
  const [kind, setKind] = useState<(typeof PROPOSAL_KINDS)[number][]>(["both"]);
  const [speakers, setSpeakers] = useState<Speaker[]>([emptySpeaker()]);
  const [topics, setTopics] = useState<Topic[]>([emptyTopic()]);
  const k = kind[0];

  if (state === "done") {
    return <FormPage title={t.prTitle} lede={t.prLede}><p className="done body">{t.prDone}</p></FormPage>;
  }

  return (
    <FormPage title={t.prTitle} lede={t.prLede}>
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit({
            ...f,
            kind: k,
            speakers: k === "topics" ? [] : speakers.filter((s) => s.name.trim()),
            topics: k === "speakers" ? [] : topics.filter((x) => x.title.trim()),
          });
        }}
      >
        <Honeypot value={f.website} onChange={(v) => setF({ ...f, website: v })} />

        <fieldset>
          <legend className="meta-lg">{t.prYou}</legend>
          <div className="grid2">
            <Field label={t.fName} name="name" errors={errors}>
              <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label={t.fEmail} name="email" errors={errors}>
              <input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
            </Field>
          </div>
          <Field label={t.prWhat} name="kind" errors={errors} group>
            <Chips name="kind" options={PROPOSAL_KINDS} value={kind} onChange={setKind} labels={(o) => t[`kind_${o}`]} />
          </Field>
        </fieldset>

        {k !== "topics" && (
          <Rows
            legend={t.prSpeakers}
            rows={speakers}
            setRows={setSpeakers}
            empty={emptySpeaker}
            errorKey="speakers"
            errors={errors}
            render={(s, upd, i) => (
              <>
                <div className="grid2">
                  <Field label={t.fName} name={`speakers.${i}.name`} errors={errors}>
                    <input className="input" value={s.name} onChange={upd("name")} />
                  </Field>
                  <Field label={t.fLinkedin} name={`speakers.${i}.linkedin_url`} errors={errors} optional>
                    <input className="input" value={s.linkedin_url} onChange={upd("linkedin_url")} placeholder={t.fLinkedinHint} />
                  </Field>
                  <Field label={t.fCompany} name={`speakers.${i}.company`} errors={errors} optional>
                    <input className="input" value={s.company} onChange={upd("company")} />
                  </Field>
                  <Field label={t.fRole} name={`speakers.${i}.role`} errors={errors} optional>
                    <input className="input" value={s.role} onChange={upd("role")} />
                  </Field>
                </div>
                <Field label={t.fWhy} name={`speakers.${i}.reason`} errors={errors} optional>
                  <input className="input" value={s.reason} onChange={upd("reason")} />
                </Field>
              </>
            )}
          />
        )}

        {k !== "speakers" && (
          <Rows
            legend={t.prTopics}
            rows={topics}
            setRows={setTopics}
            empty={emptyTopic}
            errorKey="topics"
            errors={errors}
            render={(x, upd, i) => (
              <>
                <Field label={t.fTopic} name={`topics.${i}.title`} errors={errors}>
                  <input className="input" value={x.title} onChange={upd("title")} />
                </Field>
                <Field label={t.fDescription} name={`topics.${i}.description`} errors={errors} optional>
                  <input className="input" value={x.description} onChange={upd("description")} />
                </Field>
              </>
            )}
          />
        )}

        <SubmitRow state={state} formError={formError} />
      </form>
    </FormPage>
  );
}

/** A list of repeatable inputs with "add another" and "remove". */
function Rows<R extends Record<string, string>>({ legend, rows, setRows, empty, errorKey, errors, render }: {
  legend: string;
  rows: R[];
  setRows: (rows: R[]) => void;
  empty: () => R;
  errorKey: string;
  errors: FieldErrors;
  render: (row: R, upd: (k: keyof R) => (e: React.ChangeEvent<HTMLInputElement>) => void, i: number) => React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <fieldset>
      <legend className="meta-lg">{legend}</legend>
      {errors[errorKey] && <p className="error">{t.required}</p>}
      <div>
        {rows.map((row, i) => {
          const upd = (k: keyof R) => (e: React.ChangeEvent<HTMLInputElement>) =>
            setRows(rows.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
          return (
            <div className="repeat" key={i}>
              {render(row, upd, i)}
              {rows.length > 1 && (
                <button type="button" className="btn-text label" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                  {t.remove}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {rows.length < 20 && (
        <button type="button" className="btn-text label" onClick={() => setRows([...rows, empty()])}>
          {t.addAnother}
        </button>
      )}
    </fieldset>
  );
}
