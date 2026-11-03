"use client";

import { useState } from "react";
import { CITY_OPTS, EVENT_STATUS } from "@/lib/admin/columns";
import { pacificInputToISO } from "@/lib/tz";
import type { EventRow } from "@/lib/admin/types";
import type { AdminDb } from "./useAdminDb";

/** Creates a dinner, then links any speakers / moves any students that were selected. */
export function NewEventDialog({ db, events, speakerIds = [], studentIds = [], onClose }: {
  db: AdminDb;
  events: EventRow[];
  speakerIds?: string[];
  studentIds?: string[];
  onClose: () => void;
}) {
  const [f, setF] = useState({
    number: String(Math.max(0, ...events.map((e) => e.number)) + 1),
    title_es: "", title_en: "", starts_at: "", city: "", venue: "", sponsor: "",
    speakers_needed: "3", status: "upcoming", applications_open: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const id = await db.createEvent({
      number: Number(f.number),
      title_es: f.title_es.trim(),
      title_en: (f.title_en || f.title_es).trim(),
      starts_at: f.starts_at ? pacificInputToISO(f.starts_at) : null,
      city: f.city || null,
      venue: f.venue || null,
      sponsor: f.sponsor || null,
      speakers_needed: Number(f.speakers_needed),
      status: f.status,
      applications_open: f.applications_open,
    });
    if (id && speakerIds.length) await db.linkSpeakers(id, speakerIds, "invited");
    if (id && studentIds.length) await db.updateMany("students", studentIds, { event_id: id }, "Estudiantes movidos a la nueva cena.");
    if (id && !speakerIds.length && !studentIds.length) db.refresh("Cena creada.");
    setSaving(false);
    if (id) onClose();
  }

  return (
    <div className="a-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="a-dialog" onSubmit={create} onClick={(e) => e.stopPropagation()}>
        <h2>Nueva cena</h2>
        {(speakerIds.length > 0 || studentIds.length > 0) && (
          <p className="a-muted">
            Se agregarán {speakerIds.length > 0 && `${speakerIds.length} speaker(s) como invitados`}
            {speakerIds.length > 0 && studentIds.length > 0 && " y "}
            {studentIds.length > 0 && `${studentIds.length} estudiante(s)`}.
          </p>
        )}
        <div className="a-grid">
          <label>No.<input type="number" min={1} required value={f.number} onChange={set("number")} /></label>
          <label>Speakers necesarios<input type="number" min={0} max={10} value={f.speakers_needed} onChange={set("speakers_needed")} /></label>
          <label className="span2">Tema (ES)<input required value={f.title_es} onChange={set("title_es")} /></label>
          <label className="span2">Tema (EN)<input value={f.title_en} onChange={set("title_en")} placeholder="Si lo dejas vacío, usa el de español" /></label>
          <label>Fecha y hora (hora del Pacífico)<input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} /></label>
          <label>Ciudad
            <select value={f.city} onChange={set("city")}>
              <option value="">Por definir</option>
              {CITY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label>Lugar (no se muestra en la página)<input value={f.venue} onChange={set("venue")} /></label>
          <label>Sponsor<input value={f.sponsor} onChange={set("sponsor")} /></label>
          <label>Estado
            <select value={f.status} onChange={set("status")}>
              {EVENT_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="a-inline">
            <input type="checkbox" checked={f.applications_open} onChange={(e) => setF({ ...f, applications_open: e.target.checked })} />
            Abrir aplicaciones de estudiantes
          </label>
        </div>
        <div className="ce-row">
          <button className="a-btn primary" disabled={saving}>{saving ? "Creando…" : "Crear cena"}</button>
          <button type="button" className="a-link" onClick={onClose}>Cancelar</button>
        </div>
      </form>
    </div>
  );
}
