"use client";

import Link from "next/link";
import { useState } from "react";
import { LangToggle, useLang } from "../LangProvider";
import { Footer } from "../Home";

export type FieldErrors = Record<string, string>;

export function FormPage({ title, lede, children }: { title: string; lede: string; children: React.ReactNode }) {
  const { t } = useLang();
  return (
    <>
      <nav className="topbar label">
        <Link href="/">{t.back}</Link>
        <LangToggle />
      </nav>
      <main className="block form-page" style={{ paddingTop: 24 }}>
        <div className="head">
          <h2>{title}</h2>
          <p className="body soft">{lede}</p>
        </div>
        {children}
      </main>
      <Footer />
    </>
  );
}

export function Field({ label, name, errors, optional, group, children }: {
  label: string;
  name: string;
  errors: FieldErrors;
  optional?: boolean;
  /** Set for chip groups, which hold their own labels. */
  group?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useLang();
  const error = errors[name];
  const Tag = group ? "div" : "label";
  return (
    <Tag className={`field ${error ? "invalid" : ""}`} role={group ? "group" : undefined} aria-label={group ? label : undefined}>
      <span className="label">
        {label}
        {optional && <span className="soft"> · {t.optional}</span>}
      </span>
      {children}
      {error && <p className="error">{error}</p>}
    </Tag>
  );
}

export function Chips<T extends string>({ name, options, value, onChange, multiple, labels }: {
  name: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  labels: (o: T) => string;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <label className="chip" key={o}>
          <input
            type={multiple ? "checkbox" : "radio"}
            name={name}
            checked={value.includes(o)}
            onChange={() =>
              onChange(multiple ? (value.includes(o) ? value.filter((v) => v !== o) : [...value, o]) : [o])
            }
          />
          <span>{labels(o)}</span>
        </label>
      ))}
    </div>
  );
}

/** Invisible to people; bots that fill it get rejected by the server. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hp" aria-hidden="true">
      <label>
        Website
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

/** Posts JSON to a route handler and maps its error response to messages. */
export function useSubmit(endpoint: string) {
  const { t } = useLang();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(payload: unknown) {
    setState("sending");
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setState("done");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) setFormError(t.errorDuplicate);
      else setFormError(t.errorGeneric);
      if (body.fields) setErrors(toMessages(body.fields, t));
    } catch {
      setFormError(t.errorGeneric);
    }
    setState("idle");
  }

  return { state, errors, formError, submit };
}

function toMessages(fields: Record<string, string>, t: ReturnType<typeof useLang>["t"]): FieldErrors {
  const out: FieldErrors = {};
  for (const [path, code] of Object.entries(fields)) {
    out[path] = path.endsWith("linkedin_url") ? t.invalidLinkedin : path === "email" ? t.invalidEmail : t.required;
    if (code === "too_long") out[path] = `200 ${t.words} max.`;
  }
  return out;
}

export function SubmitRow({ state, formError }: { state: string; formError: string | null }) {
  const { t } = useLang();
  return (
    <div className="submit-row">
      {formError && <p className="form-error body">{formError}</p>}
      <button className="btn label" type="submit" disabled={state === "sending"}>
        {state === "sending" ? t.sending : t.send}
      </button>
    </div>
  );
}
