"use client";

import { useState } from "react";
import {
  SEAT_STATUS, SPEAKER_STATUS, STUDENT_STATUS, eventColumns, eventLabel, feedbackAuthor, feedbackColumns,
  inviteColumns, proposalColumns,
  proposalSpeakerColumns, proposalTopicColumns, referralColumns, speakerColumns, studentColumns,
} from "@/lib/admin/columns";
import type { AdminData, EventRow, EventSpeaker, TableName } from "@/lib/admin/types";
import { dueToday } from "@/lib/emails/due";
import { KIND_LABEL, type EmailKind } from "@/lib/emails/schedule";
import { DataTable } from "./DataTable";
import { EventDetail } from "./EventDetail";
import { NewEventDialog } from "./NewEventDialog";
import { NewSpeaker } from "./NewSpeaker";
import { exportSheets } from "./excel";
import { useAdminDb } from "./useAdminDb";

const TABS = [
  { key: "events", label: "Cenas" },
  { key: "speakers", label: "Speakers" },
  { key: "invites", label: "Invitaciones" },
  { key: "students", label: "Estudiantes" },
  { key: "feedback", label: "Feedback" },
  { key: "proposals", label: "Propuestas" },
  { key: "referrals", label: "Referidos" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export function Dashboard({ data, email, initialTab = "events", initialEvent = null, initialEmail = null }: {
  data: AdminData;
  email: string;
  initialTab?: Tab;
  initialEvent?: string | null;
  initialEmail?: EmailKind | null;
}) {
  const db = useAdminDb();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [openEvent, setOpenEvent] = useState<string | null>(initialEvent);
  const [newEvent, setNewEvent] = useState<{ speakerIds?: string[]; studentIds?: string[] } | null>(null);
  const [openEmail, setOpenEmail] = useState<EmailKind | null>(initialEmail);
  const [showPending, setShowPending] = useState(false);
  const opened = data.events.find((e) => e.id === openEvent);
  const pending = dueToday(data);
  const pendingCount = pending.emails.length + pending.unpaid.length;
  const openDinner = (id: string, kind: EmailKind | null = null) => {
    setOpenEmail(kind);
    setOpenEvent(id);
    setShowPending(false);
  };

  const save = (table: TableName) => async (row: { id: string }, key: string, value: unknown) => {
    await db.update(table, row.id, { [key]: value });
  };

  const confirmDelete = (table: TableName, ids: string[], clear: () => void) => {
    if (window.confirm(`¿Eliminar ${ids.length} registro(s)? No se puede deshacer.`)) {
      db.deleteMany(table, ids).then((ok) => ok && clear());
    }
  };

  /** Adds the chosen feedback's "moment or line" to its dinner's quotes (up to 3, with permission). */
  async function addAsQuotes(ids: string[]) {
    const rows = data.feedback.filter((f) => ids.includes(f.id) && f.highlight);
    const blocked = rows.filter((f) => !f.quote_ok);
    if (blocked.length) {
      window.alert(`${blocked.length} de las respuestas no dieron permiso para citarlas.`);
      return false;
    }
    if (!rows.length) {
      window.alert("Ninguna de esas respuestas tiene “momento o frase”.");
      return false;
    }
    for (const eventId of new Set(rows.map((f) => f.event_id))) {
      const event = data.events.find((e) => e.id === eventId)!;
      const added = rows.filter((f) => f.event_id === eventId).map((f) => ({ text: f.highlight!, author: feedbackAuthor(f, data).credit }));
      const quotes = [...event.quotes, ...added];
      if (quotes.length > 3) {
        window.alert(`No. ${event.number} ya tiene ${event.quotes.length} frase(s); caben 3. Quita alguna en la cena primero.`);
        return false;
      }
      if (!(await db.update("events", eventId, { quotes }))) return false;
    }
    db.refresh("Frases agregadas a la página.");
    return true;
  }

  function exportAll() {
    exportSheets("sobremesa-todo", [
      { name: "Cenas", columns: eventColumns(data), rows: data.events },
      { name: "Speakers", columns: speakerColumns(data), rows: data.speakers },
      { name: "Estudiantes", columns: studentColumns(data), rows: data.students },
      { name: "Propuestas", columns: proposalColumns(), rows: data.proposals },
      { name: "Speakers propuestos", columns: proposalSpeakerColumns(data), rows: data.proposalSpeakers },
      { name: "Temas propuestos", columns: proposalTopicColumns(data), rows: data.proposalTopics },
      { name: "Referidos", columns: referralColumns(data), rows: data.referrals },
      { name: "Invitaciones", columns: inviteColumns(data), rows: data.invites },
      { name: "Feedback", columns: feedbackColumns(data), rows: data.feedback },
    ]);
  }

  return (
    <div className="admin">
      <header className="a-head">
        <div className="a-brand">Sobremesa <span>Admin</span></div>
        <nav className="a-tabs">
          {TABS.map((t) => (
            <button key={t.key} aria-current={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </nav>
        <div className="a-user">
          <button className={`a-btn ${pendingCount ? "primary" : ""}`} onClick={() => setShowPending(!showPending)}>
            {pendingCount ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"}` : "Nada pendiente"}
          </button>
          <button className="a-btn" onClick={exportAll}>Exportar todo</button>
          <span className="a-muted">{email}</span>
          <form action="/auth/signout" method="post"><button className="a-link">Salir</button></form>
        </div>
      </header>

      {showPending && (
        <div className="a-pending">
          {pendingCount === 0 && <p className="a-muted">No toca enviar nada hoy.</p>}
          <ul>
            {pending.emails.map((d) => (
              <li key={`${d.event.id}-${d.kind}`}>
                <button className="a-link" onClick={() => openDinner(d.event.id, d.kind)}>
                  No. {d.event.number} — {KIND_LABEL[d.kind]}: {d.pending} por enviar{d.needsPhotos ? " (sube las fotos primero)" : ""}
                </button>
              </li>
            ))}
            {pending.unpaid.map(({ event, student }) => (
              <li key={student.id}>
                <button className="a-link" onClick={() => openDinner(event.id)}>
                  No. {event.number} — {student.name}: 48 h sin pagar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <main className="a-main">
        {tab === "events" && (
          <>
            <div className="a-toolbar"><button className="a-btn primary" onClick={() => setNewEvent({})}>+ Nueva cena</button></div>
            <DataTable
              title="Cenas"
              exportName="sobremesa-cenas"
              rows={data.events}
              columns={eventColumns(data)}
              onSave={save("events")}
              onOpen={(e: EventRow) => setOpenEvent(e.id)}
              actions={(sel, clear) => (
                <button className="a-btn danger" onClick={() => confirmDelete("events", sel.map((s) => s.id), clear)}>Eliminar</button>
              )}
            />
          </>
        )}

        {tab === "speakers" && (
          <>
            <div className="a-toolbar"><NewSpeaker db={db} /></div>
            <DataTable
              title="Speakers"
              exportName="sobremesa-speakers"
              rows={data.speakers}
              columns={speakerColumns(data)}
              onSave={save("speakers")}
              actions={(sel, clear) => {
                const ids = sel.map((s) => s.id);
                return (
                  <>
                    <EventPicker
                      label="Agregar a cena…"
                      events={data.events}
                      extra={SEAT_STATUS}
                      extraDefault="invited"
                      onPick={(eventId, status) => db.linkSpeakers(eventId, ids, status as EventSpeaker["status"]).then((ok) => ok && clear())}
                    />
                    <button className="a-btn" onClick={() => setNewEvent({ speakerIds: ids })}>Crear nueva cena con ellos</button>
                    <StatusPicker options={SPEAKER_STATUS} onPick={(status) => db.updateMany("speakers", ids, { status }, "Estado actualizado.")} />
                    <button className="a-btn danger" onClick={() => confirmDelete("speakers", ids, clear)}>Eliminar</button>
                  </>
                );
              }}
            />
          </>
        )}

        {tab === "invites" && (
          <>
            <p className="a-muted">
              Para crear una invitación: agrega un speaker con fechas tentativas, o usa “Invitar con fechas” dentro de una cena.
            </p>
            <DataTable
              title="Invitaciones"
              exportName="sobremesa-invitaciones"
              rows={data.invites}
              columns={inviteColumns(data)}
              onSave={save("invites")}
              actions={(sel, clear) => (
                <button className="a-btn danger" onClick={() => confirmDelete("invites", sel.map((s) => s.id), clear)}>Eliminar</button>
              )}
            />
          </>
        )}

        {tab === "students" && (
          <DataTable
            title="Estudiantes"
            exportName="sobremesa-estudiantes"
            rows={data.students}
            columns={studentColumns(data)}
            onSave={save("students")}
            actions={(sel, clear) => {
              const ids = sel.map((s) => s.id);
              return (
                <>
                  <StatusPicker options={STUDENT_STATUS} onPick={(status) => db.updateMany("students", ids, { status }, "Estado actualizado.")} />
                  <EventPicker
                    label="Mover a cena…"
                    events={data.events}
                    onPick={(eventId) => db.updateMany("students", ids, { event_id: eventId }, "Estudiantes movidos.").then((ok) => ok && clear())}
                  />
                  <button className="a-btn" onClick={() => setNewEvent({ studentIds: ids })}>Crear nueva cena con ellos</button>
                  <button className="a-btn danger" onClick={() => confirmDelete("students", ids, clear)}>Eliminar</button>
                </>
              );
            }}
          />
        )}

        {tab === "feedback" && (
          <DataTable
            title="Feedback"
            exportName="sobremesa-feedback"
            rows={data.feedback}
            columns={feedbackColumns(data)}
            onSave={save("feedback")}
            actions={(sel, clear) => (
              <>
                <button className="a-btn" onClick={() => addAsQuotes(sel.map((s) => s.id)).then((ok) => ok && clear())}>
                  Usar como frase en la página
                </button>
                <button className="a-btn danger" onClick={() => confirmDelete("feedback", sel.map((s) => s.id), clear)}>Eliminar</button>
              </>
            )}
          />
        )}

        {tab === "proposals" && (
          <>
            <DataTable
              title="Speakers propuestos"
              exportName="sobremesa-speakers-propuestos"
              rows={data.proposalSpeakers}
              columns={proposalSpeakerColumns(data)}
              onSave={save("proposal_speakers")}
              actions={(sel, clear) => (
                <button className="a-btn danger" onClick={() => confirmDelete("proposal_speakers", sel.map((s) => s.id), clear)}>Eliminar</button>
              )}
            />
            <DataTable
              title="Temas propuestos"
              exportName="sobremesa-temas-propuestos"
              rows={data.proposalTopics}
              columns={proposalTopicColumns(data)}
              onSave={save("proposal_topics")}
              actions={(sel, clear) => (
                <button className="a-btn danger" onClick={() => confirmDelete("proposal_topics", sel.map((s) => s.id), clear)}>Eliminar</button>
              )}
            />
            <DataTable
              title="Quién propuso"
              exportName="sobremesa-propuestas"
              rows={data.proposals}
              columns={proposalColumns()}
              onSave={save("proposals")}
              actions={(sel, clear) => (
                <button className="a-btn danger" onClick={() => confirmDelete("proposals", sel.map((s) => s.id), clear)}>Eliminar (con sus speakers y temas)</button>
              )}
            />
          </>
        )}

        {tab === "referrals" && (
          <DataTable
            title="Referidos"
            exportName="sobremesa-referidos"
            rows={data.referrals}
            columns={referralColumns(data)}
            onSave={save("referrals")}
            actions={(sel, clear) => (
              <button className="a-btn danger" onClick={() => confirmDelete("referrals", sel.map((s) => s.id), clear)}>Eliminar</button>
            )}
          />
        )}
      </main>

      {opened && (
        <EventDetail key={`${opened.id}-${openEmail}`} event={opened} data={data} db={db} admin={email} initialEmail={openEmail}
          onClose={() => { setOpenEvent(null); setOpenEmail(null); }} />
      )}
      {newEvent && (
        <NewEventDialog db={db} events={data.events} {...newEvent} onClose={() => setNewEvent(null)} />
      )}

      {db.message && (
        <div className={`a-toast ${db.message.error ? "error" : ""}`} role="status">
          {db.message.text}
          <button className="a-link" onClick={db.dismiss} aria-label="Cerrar">✕</button>
        </div>
      )}
      {db.busy && <div className="a-busy" aria-hidden="true" />}
    </div>
  );
}

function EventPicker({ label, events, onPick, extra, extraDefault }: {
  label: string;
  events: EventRow[];
  onPick: (eventId: string, extra: string) => void;
  extra?: { value: string; label: string }[];
  extraDefault?: string;
}) {
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState(extraDefault ?? "");
  return (
    <span className="a-picker">
      <select value={eventId} onChange={(e) => setEventId(e.target.value)} aria-label={label}>
        <option value="">{label}</option>
        {events.map((e) => <option key={e.id} value={e.id}>{eventLabel(e)}</option>)}
      </select>
      {extra && (
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
          {extra.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      <button className="a-btn primary" disabled={!eventId} onClick={() => onPick(eventId, status)}>Aplicar</button>
    </span>
  );
}

function StatusPicker({ options, onPick }: { options: { value: string; label: string }[]; onPick: (v: string) => void }) {
  return (
    <select value="" onChange={(e) => e.target.value && onPick(e.target.value)} aria-label="Cambiar estado">
      <option value="">Cambiar estado…</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
