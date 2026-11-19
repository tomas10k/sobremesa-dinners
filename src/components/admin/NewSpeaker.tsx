"use client";

import { useState } from "react";
import { INDUSTRY_OPTS } from "@/lib/admin/columns";
import { cleanDates, DatesInput, InviteLink } from "./Invites";
import type { AdminDb } from "./useAdminDb";

/**
 * Quick add for speakers the team already talked to: only the main fields, no availability.
 * With tentative dates, it creates their personal invite link. Without, inside a dinner
 * (`eventId`) they're added to it already confirmed.
 */
export function NewSpeaker({ eventId, db }: { eventId?: string; db: AdminDb }) {
  const blank = { name: "", company: "", role: "", industry: "", email: "", linkedin_url: "", bio: "", public_profile: false };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const [dates, setDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });
  const picked = cleanDates(dates);

  const invite = created && (
    <p className="a-box a-row">
      Invitación para {created.name}: <InviteLink code={created.code} db={db} />
      <button className="a-link" onClick={() => setCreated(null)}>Listo</button>
    </p>
  );

  if (!open) {
    return (
      <>
        {invite}
        <button className="a-btn" onClick={() => setOpen(true)}>
          + Agregar speaker que ya conocemos
        </button>
      </>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const name = f.name.trim();
    const code = await db.addSpeaker(
      {
        ...f,
        name,
        company: f.company.trim(),
        role: f.role.trim(),
        email: f.email.trim().toLowerCase() || null,
        linkedin_url: f.linkedin_url.trim() || null,
        bio: f.bio.trim() || null,
      },
      { eventId, dates: picked },
    );
    setSaving(false);
    if (code === null) return;
    if (code) setCreated({ name, code });
    setF(blank);
    setDates([]);
    setOpen(false);
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
      <label className="span2">Bio corta (opcional, va en los correos a estudiantes y speakers)
        <input value={f.bio} maxLength={400} onChange={set("bio")} placeholder="CEO de…, Haas MBA '17. Antes en…" />
      </label>
      <div className="span2 a-field">
        Fechas tentativas en las que puede (opcional, hasta 3). Si pones fechas, se crea su link de invitación.
        <DatesInput value={dates} onChange={setDates} />
      </div>
      <label className="a-inline span2">
        <input type="checkbox" checked={f.public_profile} onChange={(e) => setF({ ...f, public_profile: e.target.checked })} />
        Autorizó mostrar su nombre y foto
      </label>
      <div className="a-row span2">
        <button className="a-btn primary" disabled={saving}>
          {saving ? "Guardando…"
            : picked.length ? "Agregar y crear invitación"
            : eventId ? "Agregar y confirmar en esta cena"
            : "Agregar speaker"}
        </button>
        <button type="button" className="a-link" onClick={() => setOpen(false)}>Cancelar</button>
      </div>
    </form>
  );
}
