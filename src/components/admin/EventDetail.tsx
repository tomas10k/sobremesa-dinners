"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CITY_OPTS, INDUSTRY_OPTS, SEAT_STATUS, STUDENT_STATUS, eventLabel } from "@/lib/admin/columns";
import { formatPacific } from "@/lib/tz";
import type { AdminData, EventRow, EventSpeaker, SpeakerRow, StudentRow } from "@/lib/admin/types";
import type { AdminDb } from "./useAdminDb";

const STUDENT_SEATS = 12;
const SEATED: StudentRow["status"][] = ["accepted", "confirmed", "attended"];

export function EventDetail({ event, data, db, onClose }: {
  event: EventRow;
  data: AdminData;
  db: AdminDb;
  onClose: () => void;
}) {
  const links = data.eventSpeakers.filter((l) => l.event_id === event.id);
  const speakers = links
    .map((l) => ({ link: l, speaker: data.speakers.find((s) => s.id === l.speaker_id) }))
    .filter((x) => x.speaker);
  const students = data.students.filter((s) => s.event_id === event.id);
  const confirmed = links.filter((l) => l.status === "confirmed").length;
  const seated = students.filter((s) => SEATED.includes(s.status)).length;
  const unlinked = data.speakers.filter((s) => !links.some((l) => l.speaker_id === s.id));

  const [applyUrl, setApplyUrl] = useState("");
  const [qr, setQr] = useState("");
  const [openEssay, setOpenEssay] = useState<string | null>(null);
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
        {event.status !== "draft" && (
          <a className="a-link" href={`/cena/${event.number}`} target="_blank" rel="noopener noreferrer">Ver página pública ↗</a>
        )}

        <div className="a-meters">
          <Meter label="Speakers confirmados" value={confirmed} max={event.speakers_needed} />
          <Meter label="Estudiantes aceptados" value={seated} max={STUDENT_SEATS} note={`${students.length} aplicaron`} />
        </div>

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
              </div>
              <select value={s.status} onChange={(e) => db.update("students", s.id, { status: e.target.value })}>
                {STUDENT_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
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

/** Adds someone who never filled out the form, already confirmed for this dinner. */
function NewSpeaker({ eventId, db }: { eventId: string; db: AdminDb }) {
  const blank = { name: "", company: "", role: "", industry: "", email: "", linkedin_url: "", public_profile: false };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  if (!open) return <button className="a-btn" onClick={() => setOpen(true)}>+ Speaker nuevo (que no llenó el formulario)</button>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const ok = await db.addSpeakerToEvent(eventId, {
      ...f,
      name: f.name.trim(),
      company: f.company.trim(),
      role: f.role.trim(),
      email: f.email.trim().toLowerCase() || null,
      linkedin_url: f.linkedin_url.trim() || null,
    });
    setSaving(false);
    if (ok) {
      setF(blank);
      setOpen(false);
    }
  }

  return (
    <form className="a-grid a-box" onSubmit={save}>
      <label>Nombre<input required value={f.name} onChange={set("name")} /></label>
      <label>Industria
        <select required value={f.industry} onChange={set("industry")}>
          <option value="">Elige…</option>
          {INDUSTRY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label>Rol<input required value={f.role} onChange={set("role")} /></label>
      <label>Empresa<input required value={f.company} onChange={set("company")} /></label>
      <label>Email (opcional)<input type="email" value={f.email} onChange={set("email")} /></label>
      <label>LinkedIn (opcional)<input value={f.linkedin_url} onChange={set("linkedin_url")} /></label>
      <label className="a-inline span2">
        <input type="checkbox" checked={f.public_profile} onChange={(e) => setF({ ...f, public_profile: e.target.checked })} />
        Autorizó mostrar su nombre y foto
      </label>
      <div className="a-row span2">
        <button className="a-btn primary" disabled={saving}>{saving ? "Guardando…" : "Agregar y confirmar"}</button>
        <button type="button" className="a-link" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
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
