"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { CITY_OPTS, SEAT_STATUS, STUDENT_STATUS, eventLabel } from "@/lib/admin/columns";
import { formatPacific } from "@/lib/tz";
import type { AdminData, EventRow, EventSpeaker, StudentRow } from "@/lib/admin/types";
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

        <div className="a-meters">
          <Meter label="Speakers confirmados" value={confirmed} max={event.speakers_needed} />
          <Meter label="Estudiantes aceptados" value={seated} max={STUDENT_SEATS} note={`${students.length} aplicaron`} />
        </div>

        <h3>Speakers</h3>
        {speakers.length === 0 && <p className="a-muted">Ningún speaker ligado todavía.</p>}
        <ul className="a-list">
          {speakers.map(({ link, speaker }) => (
            <li key={link.speaker_id}>
              <div>
                <strong>{speaker!.name}</strong>
                <span className="a-muted"> · {speaker!.role}, {speaker!.company}</span>
                {link.source === "form" && <span className="a-tag">pidió esta cena</span>}
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
