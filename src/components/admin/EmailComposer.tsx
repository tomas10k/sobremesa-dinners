"use client";

import { useMemo, useState } from "react";
import type { AdminData, EventRow } from "@/lib/admin/types";
import { emailContext, recipientsFor } from "@/lib/emails/recipients";
import { defaultDraft, renderEmail, type Draft } from "@/lib/emails/render";
import { KIND_LABEL, audienceOf, dueAt, type EmailKind } from "@/lib/emails/schedule";
import type { Lang } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { formatPacific } from "@/lib/tz";
import type { AdminDb } from "./useAdminDb";

const LANGS: Lang[] = ["es", "en"];

/** Review, edit, preview and send one of a dinner's emails. Nothing goes out without "Enviar". */
export function EmailComposer({ event, kind, data, db, admin, onClose }: {
  event: EventRow;
  kind: EmailKind;
  data: AdminData;
  db: AdminDb;
  /** The signed-in admin's email, for "marked as sent by". */
  admin: string;
  onClose: () => void;
}) {
  const recipients = useMemo(() => recipientsFor(kind, event, data), [kind, event, data]);
  const [selected, setSelected] = useState(() => new Set(recipients.filter((r) => r.email && !r.sentAt).map((r) => r.id)));
  const [drafts, setDrafts] = useState<Record<Lang, Draft>>(() =>
    Object.fromEntries(LANGS.map((lang) => {
      const saved = data.emailDrafts.find((d) => d.event_id === event.id && d.kind === kind && d.lang === lang);
      return [lang, saved ? { subject: saved.subject, intro: saved.intro } : defaultDraft({ kind, lang })];
    })) as Record<Lang, Draft>,
  );
  const [editLang, setEditLang] = useState<Lang>(() => (recipients.some((r) => r.lang === "es") || !recipients.length ? "es" : "en"));
  const [previewId, setPreviewId] = useState(recipients[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const preview = recipients.find((r) => r.id === previewId) ?? recipients[0];
  const rendered = preview ? renderEmail(emailContext(kind, event, preview, data, SITE_URL), drafts[preview.lang]) : null;
  const chosen = recipients.filter((r) => selected.has(r.id));
  const due = dueAt(kind, event.starts_at);

  const warnings = [
    !event.starts_at && "La cena no tiene fecha.",
    kind === "student_week" && (!event.venmo_handle || event.price_usd === null) && "Falta el Venmo o el precio de esta cena: el correo saldría sin el pago.",
    kind === "speaker_week" && event.hear_points.length === 0 && "Faltan “lo que los estudiantes quieren escuchar”.",
    kind.endsWith("_day") && !event.venue && "Falta el lugar: el recordatorio es el que lleva la dirección.",
    kind.endsWith("_after") && event.photos.length === 0 && "Todavía no hay fotos de la cena: sube algunas antes de mandar el gracias.",
  ].filter(Boolean) as string[];

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  async function send(test: boolean) {
    // A test is the preview, as that person would get it, sent to you.
    const ids = test ? (preview ? [preview.id] : []) : chosen.map((r) => r.id);
    if (!ids.length) return;
    if (!test && !window.confirm(`¿Enviar “${KIND_LABEL[kind]}” a ${ids.length} persona(s)?`)) return;
    setBusy(true);
    const ok = await db.sendEmail({ event_id: event.id, kind, recipient_ids: ids, drafts, test });
    setBusy(false);
    if (ok && !test) onClose();
  }

  return (
    // Opens on top of the dinner panel: a click outside closes only this.
    <div className="a-modal" role="dialog" aria-modal="true" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="a-composer" onClick={(e) => e.stopPropagation()}>
        <button className="a-close a-link" onClick={onClose} aria-label="Cerrar">Cerrar ✕</button>
        <h2>{KIND_LABEL[kind]}</h2>
        <p className="a-muted">
          No. {event.number} — {event.title_es}
          {due && ` · Toca el ${formatPacific(due.toISOString())}`}
        </p>
        {warnings.map((w) => <p key={w} className="a-warn">{w}</p>)}

        <div className="a-composer-grid">
          <div className="a-composer-side">
            <h3>Para ({chosen.length})</h3>
            {recipients.length === 0 && <p className="a-muted">Nadie todavía: confirma speakers o acepta estudiantes primero.</p>}
            <ul className="a-list">
              {recipients.map((r) => (
                <li key={r.id}>
                  <label className="a-inline">
                    <input type="checkbox" disabled={!r.email} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                    <span>
                      {r.name} <span className="a-muted">· {r.lang.toUpperCase()}</span>
                      {!r.email && <span className="a-tag">sin email</span>}
                      {r.sentAt && <span className="a-tag">enviado {new Date(r.sentAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>}
                      {kind.startsWith("student") && !r.paid && <span className="a-tag">no ha pagado</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <h3>Texto</h3>
            <div className="a-tabs-inline">
              {LANGS.map((lang) => (
                <button key={lang} aria-current={editLang === lang} onClick={() => setEditLang(lang)}>
                  {lang.toUpperCase()} ({recipients.filter((r) => r.lang === lang).length})
                </button>
              ))}
            </div>
            <div className="a-grid">
              <label className="span2">Asunto
                <input value={drafts[editLang].subject} maxLength={200}
                  onChange={(e) => setDrafts({ ...drafts, [editLang]: { ...drafts[editLang], subject: e.target.value } })} />
              </label>
              <label className="span2">Primer párrafo
                <textarea rows={6} value={drafts[editLang].intro} maxLength={2000}
                  onChange={(e) => setDrafts({ ...drafts, [editLang]: { ...drafts[editLang], intro: e.target.value } })} />
              </label>
              <p className="a-muted span2">
                {"{name}"} se cambia por el nombre de cada quien, {"{number}"} por el número y {"{topic}"} por el tema.
                El resto del correo sale de los datos de la cena.
              </p>
              <div className="a-row span2">
                <button className="a-link" onClick={() => setDrafts({ ...drafts, [editLang]: defaultDraft({ kind, lang: editLang }) })}>
                  Volver al texto original
                </button>
                <button className="a-btn" onClick={() => db.saveDrafts(event.id, kind, drafts)}>Guardar texto</button>
              </div>
            </div>
          </div>

          <div className="a-composer-preview">
            <div className="a-row">
              <span className="a-muted">Vista previa como</span>
              <select value={preview?.id ?? ""} onChange={(e) => setPreviewId(e.target.value)}>
                {recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            {rendered ? (
              <>
                <p className="a-subject"><span className="a-muted">Asunto:</span> {rendered.subject}</p>
                <iframe title="Vista previa del correo" srcDoc={rendered.html} sandbox="allow-popups allow-popups-to-escape-sandbox" />
              </>
            ) : (
              <p className="a-muted">Sin vista previa todavía.</p>
            )}
          </div>
        </div>

        <div className="a-row a-composer-actions">
          <button
            className="a-link"
            disabled={busy || chosen.length === 0}
            title="Si ya lo mandaste por fuera (por ejemplo desde Gmail), para que deje de aparecer como pendiente."
            onClick={() =>
              window.confirm(`¿Marcar como enviado a ${chosen.length} persona(s) sin mandar nada?`) &&
              db.markSent(event.id, kind, audienceOf(kind) === "speakers" ? "speaker_id" : "student_id",
                chosen.flatMap((r) => (r.email ? [{ id: r.id, email: r.email }] : [])), admin).then((ok) => ok && onClose())
            }
          >
            Ya lo mandé por fuera
          </button>
          <button className="a-btn" disabled={busy || !preview?.email} onClick={() => send(true)}>Enviarme una prueba</button>
          <button className="a-btn primary" disabled={busy || chosen.length === 0} onClick={() => send(false)}>
            {busy ? "Enviando…" : `Enviar a ${chosen.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
