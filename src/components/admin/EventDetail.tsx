"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CITY_OPTS, RESPONSE_LABEL, SEAT_STATUS, STUDENT_STATUS, dayLabel, eventLabel } from "@/lib/admin/columns";
import { formatPacific } from "@/lib/tz";
import type { AdminData, EventRow, EventSpeaker, SpeakerRow, StudentRow } from "@/lib/admin/types";
import { eventEmailStatus, unpaidStudents } from "@/lib/emails/due";
import { KIND_LABEL, dueAt, type EmailKind } from "@/lib/emails/schedule";
import { EmailComposer } from "./EmailComposer";
import { downloadFlyer } from "./flyer";
import { InviteButton, InviteLink } from "./Invites";
import { NewSpeaker } from "./NewSpeaker";
import type { AdminDb } from "./useAdminDb";

const STUDENT_SEATS = 12;
const SEATED: StudentRow["status"][] = ["accepted", "confirmed", "attended"];

export function EventDetail({ event, data, db, admin, onClose, initialEmail = null }: {
  event: EventRow;
  data: AdminData;
  db: AdminDb;
  admin: string;
  onClose: () => void;
  /** Opens this email's composer right away (from the morning reminder's link). */
  initialEmail?: EmailKind | null;
}) {
  const links = data.eventSpeakers.filter((l) => l.event_id === event.id);
  const speakers = links
    .map((l) => ({ link: l, speaker: data.speakers.find((s) => s.id === l.speaker_id) }))
    .filter((x) => x.speaker);
  const students = data.students.filter((s) => s.event_id === event.id);
  const confirmed = links.filter((l) => l.status === "confirmed").length;
  // In the order they were linked, like the public page.
  const confirmedSpeakers = speakers.filter((x) => x.link.status === "confirmed").map((x) => x.speaker!);
  const seated = students.filter((s) => SEATED.includes(s.status)).length;
  const unlinked = data.speakers.filter((s) => !links.some((l) => l.speaker_id === s.id));

  const [applyUrl, setApplyUrl] = useState("");
  const [qr, setQr] = useState("");
  const [openEssay, setOpenEssay] = useState<string | null>(null);
  const [composing, setComposing] = useState<EmailKind | null>(initialEmail);
  const unpaid = new Set(unpaidStudents(event, data).map((r) => r.id));
  useEffect(() => {
    const url = `${window.location.origin}/estudiante?cena=${event.number}`;
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: "#1f3a2e", light: "#ffffff" } }).then((png) => {
      setApplyUrl(url);
      setQr(png);
    });
  }, [event.number]);

  return (
    <div className="a-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <aside className="a-panel" onClick={(e) => e.stopPropagation()}>
        <button className="a-close a-link" onClick={onClose} aria-label="Cerrar">Cerrar ✕</button>
        <h2>{eventLabel(event)}</h2>
        <p className="a-muted">
          {[formatPacific(event.starts_at) || "Fecha por definir", CITY_OPTS.find((c) => c.value === event.city)?.label, event.venue, event.sponsor && `Sponsor: ${event.sponsor}`]
            .filter(Boolean).join(" · ")}
        </p>
        <div className="a-row">
          {event.status !== "draft" && (
            <a className="a-link" href={`/cena/${event.number}`} target="_blank" rel="noopener noreferrer">Ver página pública ↗</a>
          )}
          {(["es", "en"] as const).map((lang) => (
            <button
              key={lang}
              className="a-btn"
              onClick={() =>
                downloadFlyer(event, confirmedSpeakers, lang).catch((err: Error) => window.alert(err.message))
              }
            >
              Descargar flyer ({lang.toUpperCase()})
            </button>
          ))}
        </div>

        <div className="a-meters">
          <Meter label="Speakers confirmados" value={confirmed} max={event.speakers_needed} />
          <Meter label="Estudiantes aceptados" value={seated} max={STUDENT_SEATS} note={`${students.length} aplicaron`} />
        </div>

        <h3>Correos</h3>
        <EmailsOverview event={event} data={data} onCompose={setComposing} />
        <div className="a-row">
          <span className="a-muted">Ver los 7 correos en tu bandeja (solo a ustedes dos):</span>
          {(["es", "en"] as const).map((lang) => (
            <button key={lang} className="a-btn" onClick={() => db.sendSamples(event.id, lang)}>
              Mandarnos muestras ({lang.toUpperCase()})
            </button>
          ))}
        </div>
        <h3>Para los correos</h3>
        <EmailFields key={`${event.id}-${event.price_usd}-${event.venmo_handle}-${event.hear_points.join("|")}-${event.whatsapp_on}-${event.whatsapp_url}`} event={event} data={data} db={db} />

        <h3>Página pública</h3>
        <DescriptionEditor key={event.id} event={event} db={db} />

        <h3>Speakers</h3>
        <p className="a-muted">
          En la página se ven los confirmados: rol y empresa siempre; nombre y foto solo si lo autorizaron.
        </p>
        {speakers.length === 0 && <p className="a-muted">Ningún speaker ligado todavía.</p>}
        <ul className="a-list">
          {speakers.map(({ link, speaker }) => (
            <li key={link.speaker_id}>
              <div>
                <strong>{speaker!.name}</strong>
                <span className="a-muted"> · {speaker!.role}, {speaker!.company}</span>
                {link.source === "form" && <span className="a-tag">pidió esta cena</span>}
                <SpeakerPublic speaker={speaker!} db={db} />
                <div className="a-public">
                  {data.invites
                    .filter((inv) => inv.speaker_id === link.speaker_id && inv.event_id === event.id)
                    .map((inv) => (
                      <span key={inv.id} className="a-row">
                        <span className="a-tag">
                          {RESPONSE_LABEL[inv.response]}
                          {inv.chosen_date && `: ${dayLabel(inv.chosen_date)}`}
                        </span>
                        <span className="a-muted">{inv.dates.map(dayLabel).join(" · ")}</span>
                        <InviteLink code={inv.code} db={db} />
                      </span>
                    ))}
                  <InviteButton speakerId={link.speaker_id} eventId={event.id} db={db} />
                </div>
              </div>
              <div className="a-row">
                <select value={link.status} onChange={(e) => db.setSeat(event.id, link.speaker_id, e.target.value as EventSpeaker["status"])}>
                  {SEAT_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button className="a-link" onClick={() => db.removeSeat(event.id, link.speaker_id)}>Quitar</button>
              </div>
            </li>
          ))}
        </ul>
        {unlinked.length > 0 && (
          <label className="a-add">
            Agregar speaker
            <select value="" onChange={(e) => e.target.value && db.linkSpeakers(event.id, [e.target.value], "invited")}>
              <option value="">Elige…</option>
              {unlinked.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.company}</option>)}
            </select>
          </label>
        )}
        <NewSpeaker eventId={event.id} db={db} />

        <h3>Fotos de la cena</h3>
        <p className="a-muted">Se muestran en la página cuando la cena ya pasó. La primera es la grande.</p>
        <EventPhotos event={event} db={db} />

        <h3>Frases (opcional)</h3>
        <p className="a-muted">Hasta 3. Aparecen debajo de las fotos cuando la cena ya pasó.</p>
        <QuotesEditor key={`${event.id}-${JSON.stringify(event.quotes)}`} event={event} db={db} />

        <h3>Estudiantes</h3>
        {students.length === 0 && <p className="a-muted">Nadie ha aplicado todavía.</p>}
        <ul className="a-list">
          {students.map((s) => (
            <li key={s.id}>
              <div>
                <strong>{s.name}</strong>
                <span className="a-muted"> · {s.university}, {s.program}, {s.year === "1" ? "1er" : "2o"} año</span>
                <button className="a-link" onClick={() => setOpenEssay(openEssay === s.id ? null : s.id)}>
                  {openEssay === s.id ? "Ocultar ensayo" : "Ver ensayo"}
                </button>
                {openEssay === s.id && <p className="a-essay">{s.essay}</p>}
                <div className="a-public">
                  {s.seat_confirmed_at && <span className="a-tag">confirmó su lugar</span>}
                  {s.dietary && <span className="a-tag">dieta: {s.dietary}</span>}
                  {unpaid.has(s.id) && <span className="a-tag a-tag-warn">48 h sin pagar</span>}
                </div>
              </div>
              <div className="a-row">
                <label className="a-inline">
                  <input type="checkbox" checked={s.paid} onChange={() => db.setPaid(s.id, !s.paid)} />
                  Pagó
                </label>
                <select value={s.status} onChange={(e) => db.update("students", s.id, { status: e.target.value })}>
                  {STUDENT_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>

        <h3>Aplicación para estudiantes</h3>
        {!event.applications_open && (
          <p className="a-warn">Las aplicaciones están cerradas: el link no mostrará esta cena hasta que las abras.</p>
        )}
        <div className="a-qr">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL, nothing to optimize */}
          {qr && <img src={qr} alt={`Código QR para aplicar a la cena No. ${event.number}`} width={140} height={140} />}
          <div>
            <code>{applyUrl}</code>
            <div className="a-row">
              <button className="a-btn" onClick={() => navigator.clipboard.writeText(applyUrl).then(() => db.refresh("Link copiado."))}>Copiar link</button>
              {qr && <a className="a-btn" href={qr} download={`sobremesa-no-${event.number}-qr.png`}>Descargar QR</a>}
              <button
                className="a-btn"
                onClick={() => db.update("events", event.id, { applications_open: !event.applications_open })}
              >
                {event.applications_open ? "Cerrar aplicaciones" : "Abrir aplicaciones"}
              </button>
            </div>
          </div>
        </div>
      </aside>
      {composing && (
        <EmailComposer event={event} kind={composing} data={data} db={db} admin={admin} onClose={() => setComposing(null)} />
      )}
    </div>
  );
}

const STATE_LABEL = { none: "Sin destinatarios", waiting: "Programado", due: "Toca enviar", done: "Enviado", missed: "Ya pasó" } as const;

/** The dinner's emails in order, with where each stands. */
function EmailsOverview({ event, data, onCompose }: { event: EventRow; data: AdminData; onCompose: (k: EmailKind) => void }) {
  return (
    <ul className="a-list">
      {eventEmailStatus(event, data).map((s) => {
        const due = dueAt(s.kind, event.starts_at);
        return (
          <li key={s.kind}>
            <div>
              <strong>{KIND_LABEL[s.kind]}</strong>
              <div className="a-muted">
                {s.kind === "speaker_confirmed" ? "Al confirmar a cada speaker" : due ? formatPacific(due.toISOString()) : "Cuando la cena tenga fecha"}
                {s.eligible > 0 && ` · ${s.sent} de ${s.eligible} enviados`}
                {s.noEmail > 0 && ` · ${s.noEmail} sin email`}
              </div>
            </div>
            <div className="a-row">
              <span className={`a-tag a-state-${s.state}`}>{STATE_LABEL[s.state]}</span>
              <button className={`a-btn ${s.state === "due" ? "primary" : ""}`} onClick={() => onCompose(s.kind)}>Revisar y enviar</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Price, Venmo (Tomás's or Daniela's, per dinner) and what the students want to hear. */
function EmailFields({ event, data, db }: { event: EventRow; data: AdminData; db: AdminDb }) {
  const [price, setPrice] = useState(event.price_usd === null ? "" : String(event.price_usd));
  const [venmo, setVenmo] = useState(event.venmo_handle ?? "");
  const [points, setPoints] = useState(() => Array.from({ length: 3 }, (_, i) => event.hear_points[i] ?? ""));
  // The community link rarely changes: start from the last dinner that had one.
  const lastLink = data.events.find((e) => e.whatsapp_url)?.whatsapp_url ?? "";
  const [waOn, setWaOn] = useState(event.whatsapp_on);
  const [waUrl, setWaUrl] = useState(event.whatsapp_url ?? lastLink);
  const handles = [...new Set(data.events.map((e) => e.venmo_handle).filter(Boolean))] as string[];
  const cleanVenmo = venmo.trim().replace(/^@/, "");
  const next = {
    price_usd: price.trim() === "" ? null : Number(price),
    venmo_handle: cleanVenmo || null,
    hear_points: points.map((p) => p.trim()).filter(Boolean),
    whatsapp_on: waOn && Boolean(waUrl.trim()),
    whatsapp_url: waUrl.trim() || null,
  };
  const changed =
    next.price_usd !== event.price_usd || next.venmo_handle !== event.venmo_handle ||
    JSON.stringify(next.hear_points) !== JSON.stringify(event.hear_points) ||
    next.whatsapp_on !== event.whatsapp_on || next.whatsapp_url !== event.whatsapp_url;
  return (
    <div className="a-grid">
      <label>Precio por estudiante (USD)
        <input type="number" min={0} max={500} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="18" />
      </label>
      <label>Venmo que cobra esta cena
        <input list="venmo-handles" value={venmo} onChange={(e) => setVenmo(e.target.value)} placeholder="usuario-de-venmo" />
        <datalist id="venmo-handles">{handles.map((h) => <option key={h} value={h} />)}</datalist>
      </label>
      <p className="a-muted span2">Lo que los estudiantes quieren escuchar (va en “La mesa está puesta”). Hasta 3.</p>
      {points.map((p, i) => (
        <label key={i} className="span2">Punto {i + 1}
          <input value={p} maxLength={300} onChange={(e) => setPoints(points.map((x, j) => (j === i ? e.target.value : x)))} />
        </label>
      ))}
      <label className="a-inline span2">
        <input type="checkbox" checked={waOn} onChange={(e) => setWaOn(e.target.checked)} />
        Invitar a la comunidad de WhatsApp en los “gracias” (solo si todos los speakers de esta cena aceptaron)
      </label>
      <label className="span2">Link de la comunidad
        <input value={waUrl} onChange={(e) => setWaUrl(e.target.value)} placeholder="https://chat.whatsapp.com/…" />
      </label>
      <div className="a-row">
        <button className="a-btn primary" disabled={!changed} onClick={() => db.update("events", event.id, next)}>Guardar</button>
      </div>
    </div>
  );
}

function EventPhotos({ event, db }: { event: EventRow; db: AdminDb }) {
  const [uploading, setUploading] = useState(false);
  return (
    <>
      {event.photos.length > 0 && (
        <ul className="a-photos">
          {event.photos.map((url, i) => (
            <li key={url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
              <img src={url} alt={`Foto ${i + 1}`} />
              <div className="a-row">
                <button className="a-link" disabled={i === 0} onClick={() => db.moveEventPhoto(event, i, -1)} aria-label="Mover antes">←</button>
                <button className="a-link" disabled={i === event.photos.length - 1} onClick={() => db.moveEventPhoto(event, i, 1)} aria-label="Mover después">→</button>
                <button className="a-link" onClick={() => window.confirm("¿Quitar esta foto?") && db.removeEventPhoto(event, url)}>Quitar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className="a-btn" style={{ justifySelf: "start" }}>
        {uploading ? "Subiendo…" : "+ Subir fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={uploading}
          onChange={async (e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (!files.length) return;
            setUploading(true);
            await db.addEventPhotos(event, files);
            setUploading(false);
          }}
        />
      </label>
    </>
  );
}

function QuotesEditor({ event, db }: { event: EventRow; db: AdminDb }) {
  const [quotes, setQuotes] = useState(() =>
    Array.from({ length: 3 }, (_, i) => event.quotes[i] ?? { text: "", author: "" }),
  );
  const clean = quotes
    .map((q) => ({ text: q.text.trim(), author: q.author.trim() }))
    .filter((q) => q.text);
  const changed = JSON.stringify(clean) !== JSON.stringify(event.quotes);
  const set = (i: number, k: "text" | "author", v: string) =>
    setQuotes(quotes.map((q, j) => (j === i ? { ...q, [k]: v } : q)));
  return (
    <div className="a-grid">
      {quotes.map((q, i) => (
        <div key={i} className="span2 a-grid a-quote">
          <label className="span2">Frase {i + 1}
            <textarea rows={2} maxLength={400} value={q.text} onChange={(e) => set(i, "text", e.target.value)} />
          </label>
          <label className="span2">Quién lo dijo
            <input value={q.author} maxLength={120} placeholder="Ej. Ana López, VP Product en Mercado Libre" onChange={(e) => set(i, "author", e.target.value)} />
          </label>
        </div>
      ))}
      <div className="a-row">
        <button className="a-btn primary" disabled={!changed} onClick={() => db.update("events", event.id, { quotes: clean })}>
          Guardar frases
        </button>
      </div>
    </div>
  );
}

function DescriptionEditor({ event, db }: { event: EventRow; db: AdminDb }) {
  const [es, setEs] = useState(event.description_es ?? "");
  const [en, setEn] = useState(event.description_en ?? "");
  const changed = es !== (event.description_es ?? "") || en !== (event.description_en ?? "");
  const clean = (v: string) => v.trim() || null;
  return (
    <div className="a-grid">
      <label className="span2">Descripción del tema (ES)
        <textarea rows={4} value={es} onChange={(e) => setEs(e.target.value)} maxLength={2000} />
      </label>
      <label className="span2">Descripción del tema (EN)
        <textarea rows={4} value={en} onChange={(e) => setEn(e.target.value)} maxLength={2000} placeholder="Si lo dejas vacío, se muestra la de español" />
      </label>
      <div className="a-row">
        <button
          className="a-btn primary"
          disabled={!changed}
          onClick={() => db.update("events", event.id, { description_es: clean(es), description_en: clean(en) })}
        >
          Guardar descripción
        </button>
      </div>
    </div>
  );
}

/** Consent toggle and photo for one speaker. */
function SpeakerPublic({ speaker, db }: { speaker: SpeakerRow; db: AdminDb }) {
  const [uploading, setUploading] = useState(false);
  return (
    <div className="a-public">
      {/* eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail */}
      {speaker.photo_url && <img src={speaker.photo_url} alt="" width={48} height={60} />}
      <label className="a-inline">
        <input
          type="checkbox"
          checked={speaker.public_profile}
          onChange={() => db.update("speakers", speaker.id, { public_profile: !speaker.public_profile })}
        />
        Autorizó nombre y foto
      </label>
      <label className="a-btn">
        {uploading ? "Subiendo…" : speaker.photo_url ? "Cambiar foto" : "Subir foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          disabled={uploading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setUploading(true);
            await db.uploadPhoto(speaker.id, file);
            setUploading(false);
          }}
        />
      </label>
      {speaker.photo_url && (
        <button className="a-link" onClick={() => db.removePhoto(speaker.id, speaker.photo_url!)}>Quitar foto</button>
      )}
    </div>
  );
}

function Meter({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="a-meter">
      <div className="a-meter-top"><span>{label}</span><strong>{value} / {max}</strong></div>
      <div className="a-meter-bar"><div style={{ width: `${pct}%` }} /></div>
      {note && <span className="a-muted">{note}</span>}
    </div>
  );
}
