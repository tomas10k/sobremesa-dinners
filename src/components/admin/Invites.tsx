"use client";

import { useState } from "react";
import { inviteUrl } from "@/lib/admin/columns";
import type { AdminDb } from "./useAdminDb";

export const MAX_DATES = 3;

/** Up to three tentative dates. Empty strings are unfilled slots. */
export function DatesInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="a-row">
      {Array.from({ length: MAX_DATES }, (_, i) => (
        <input
          key={i}
          type="date"
          min={today}
          aria-label={`Fecha tentativa ${i + 1}`}
          value={value[i] ?? ""}
          onChange={(e) => onChange(Array.from({ length: MAX_DATES }, (_, j) => (j === i ? e.target.value : value[j] ?? "")))}
        />
      ))}
    </div>
  );
}

/** Filled dates, without repeats, in order. */
export const cleanDates = (dates: string[]) => [...new Set(dates.filter(Boolean))].sort();

export function InviteLink({ code, db }: { code: string; db: AdminDb }) {
  const url = inviteUrl(code);
  return (
    <span className="a-invite-link">
      <code>{url}</code>
      <button type="button" className="a-btn" onClick={() => navigator.clipboard.writeText(url).then(() => db.refresh("Link copiado."))}>
        Copiar link
      </button>
    </span>
  );
}

/** For a speaker who's already in the database: propose dates and get their link. */
export function InviteButton({ speakerId, eventId, db }: { speakerId: string; eventId: string | null; db: AdminDb }) {
  const [open, setOpen] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  if (!open) return <button className="a-link" onClick={() => setOpen(true)}>Invitar con fechas</button>;
  const picked = cleanDates(dates);
  return (
    <span className="a-row">
      <DatesInput value={dates} onChange={setDates} />
      <button
        className="a-btn primary"
        disabled={picked.length === 0 || saving}
        onClick={async () => {
          setSaving(true);
          const code = await db.createInvite(speakerId, eventId, picked);
          setSaving(false);
          if (code) {
            setDates([]);
            setOpen(false);
          }
        }}
      >
        Crear invitación
      </button>
      <button className="a-link" onClick={() => setOpen(false)}>Cancelar</button>
    </span>
  );
}
