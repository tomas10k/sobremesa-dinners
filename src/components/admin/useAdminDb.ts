"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { EventRow, EventSpeaker, TableName } from "@/lib/admin/types";
import { shrinkImage } from "./images";

type PgError = { code?: string; message: string } | null;

type Bucket = "speaker-photos" | "event-photos";

function friendly(error: NonNullable<PgError>): string {
  switch (error.code) {
    case "23505": return "Eso ya existe (por ejemplo, el mismo número de cena o el mismo estudiante en esa cena).";
    case "23514": return "Ese valor no es válido para ese campo.";
    case "23502": return "Ese campo no puede quedar vacío.";
    case "23503": return "No se puede: está ligado a otra cosa (por ejemplo, una cena con estudiantes).";
    case "42501": return "Tu cuenta no tiene permiso para esto.";
    default: return error.message;
  }
}

/**
 * Writes from the dashboard. They run as the signed-in admin, so row-level security
 * decides what is allowed; after each change the server data is reloaded.
 */
export function useAdminDb() {
  const db = useMemo(() => browserClient(), []);
  const router = useRouter();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [refreshing, startRefresh] = useTransition();

  async function run(result: PromiseLike<{ error: PgError }>, ok?: string): Promise<boolean> {
    const { error } = await result;
    if (error) {
      setMessage({ text: friendly(error), error: true });
      return false;
    }
    if (ok) setMessage({ text: ok, error: false });
    startRefresh(() => router.refresh());
    return true;
  }

  /** Uploads to a public bucket under `folder/`; returns the public URL, or null after showing the error. */
  async function store(bucket: Bucket, folder: string, file: File): Promise<string | null> {
    try {
      const blob = await shrinkImage(file);
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await db.storage.from(bucket).upload(path, blob, { contentType: blob.type });
      if (error) throw new Error(error.message);
      return db.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    } catch (err) {
      setMessage({ text: `No se pudo subir la foto: ${(err as Error).message}`, error: true });
      return null;
    }
  }

  async function unstore(bucket: Bucket, url: string) {
    const path = url.split(`/${bucket}/`)[1];
    if (path) await db.storage.from(bucket).remove([path]);
  }

  return {
    message,
    dismiss: () => setMessage(null),
    busy: refreshing,

    /** Reload server data and show a note (for multi-step changes). */
    refresh: (ok: string) => {
      setMessage({ text: ok, error: false });
      startRefresh(() => router.refresh());
    },

    update: (table: TableName, id: string, patch: Record<string, unknown>) =>
      run(db.from(table).update(patch).eq("id", id)),

    updateMany: (table: TableName, ids: string[], patch: Record<string, unknown>, ok: string) =>
      run(db.from(table).update(patch).in("id", ids), ok),

    deleteMany: (table: TableName, ids: string[]) =>
      run(db.from(table).delete().in("id", ids), `${ids.length} eliminados.`),

    createEvent: async (fields: Record<string, unknown>): Promise<string | null> => {
      const { data, error } = await db.from("events").insert(fields).select("id").single();
      if (error) {
        setMessage({ text: friendly(error), error: true });
        return null;
      }
      return data.id as string;
    },

    linkSpeakers: (eventId: string, speakerIds: string[], status: EventSpeaker["status"]) =>
      run(
        db.from("event_speakers").upsert(
          speakerIds.map((speaker_id) => ({ event_id: eventId, speaker_id, status, source: "admin" })),
          { onConflict: "event_id,speaker_id" },
        ),
        `${speakerIds.length} speaker(s) agregados a la cena.`,
      ),

    setSeat: (eventId: string, speakerId: string, status: EventSpeaker["status"]) =>
      run(db.from("event_speakers").update({ status }).eq("event_id", eventId).eq("speaker_id", speakerId)),

    removeSeat: (eventId: string, speakerId: string) =>
      run(db.from("event_speakers").delete().eq("event_id", eventId).eq("speaker_id", speakerId)),

    /**
     * For speakers the team already knows: just the main fields, no availability.
     * With tentative dates, it also creates their invite (and, in a dinner, marks them invited).
     * Without dates, inside a dinner they're added already confirmed.
     * Returns the invite code, "" when there's no invite, or null on error.
     */
    addSpeaker: async (
      fields: Record<string, unknown>,
      { eventId, dates = [] }: { eventId?: string; dates?: string[] } = {},
    ): Promise<string | null> => {
      const inviting = dates.length > 0;
      const { data, error } = await db
        .from("speakers")
        .insert({ ...fields, status: eventId && !inviting ? "confirmed" : "contacted" })
        .select("id")
        .single();
      const fail = (e: NonNullable<PgError>) => {
        setMessage({ text: friendly(e), error: true });
        return null;
      };
      if (error) return fail(error);

      if (eventId) {
        const { error: linkError } = await db.from("event_speakers").insert({
          event_id: eventId, speaker_id: data.id, status: inviting ? "invited" : "confirmed", source: "admin",
        });
        if (linkError) return fail(linkError);
      }
      let code = "";
      if (inviting) {
        const { data: invite, error: inviteError } = await db
          .from("invites")
          .insert({ speaker_id: data.id, event_id: eventId ?? null, dates })
          .select("code")
          .single();
        if (inviteError) return fail(inviteError);
        code = invite.code as string;
      }
      setMessage({
        text: inviting ? "Speaker agregado. Copia su invitación abajo." : eventId ? "Speaker agregado y confirmado." : "Speaker agregado.",
        error: false,
      });
      startRefresh(() => router.refresh());
      return code;
    },

    /** Sends one of a dinner's emails (or a test to yourself) through the admin route. */
    sendEmail: async (body: {
      event_id: string; kind: string; recipient_ids: string[];
      drafts: Record<"es" | "en", { subject: string; intro: string }>; test: boolean;
    }) => {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const text = json.message ?? (json.error === "invalid" ? "Revisa el asunto y el texto de los dos idiomas." : "No se pudo enviar.");
        setMessage({ text, error: true });
        return false;
      }
      setMessage({ text: body.test ? `Prueba enviada a ${json.test}.` : `${json.sent} correo(s) enviados.`, error: false });
      if (!body.test) startRefresh(() => router.refresh());
      return true;
    },

    /** For emails sent outside the app (e.g. from Gmail), so they stop showing as pending. */
    markSent: (eventId: string, kind: string, by: "speaker_id" | "student_id", people: { id: string; email: string }[], admin: string) =>
      run(
        db.from("email_log").insert(people.map((p) => ({ event_id: eventId, kind, [by]: p.id, email: p.email, sent_by: `${admin} (a mano)` }))),
        `${people.length} marcado(s) como enviados.`,
      ),

    saveDrafts: (eventId: string, kind: string, drafts: Record<"es" | "en", { subject: string; intro: string }>) =>
      run(
        db.from("email_drafts").upsert(
          (["es", "en"] as const).map((lang) => ({ event_id: eventId, kind, lang, ...drafts[lang], updated_at: new Date().toISOString() })),
        ),
        "Texto guardado.",
      ),

    setPaid: (studentId: string, paid: boolean) =>
      run(db.from("students").update({ paid, paid_at: paid ? new Date().toISOString() : null }).eq("id", studentId)),

    /** Creates a personal invite and returns its code (the link is /invitacion/<code>). */
    createInvite: async (speakerId: string, eventId: string | null, dates: string[]): Promise<string | null> => {
      const { data, error } = await db
        .from("invites")
        .insert({ speaker_id: speakerId, event_id: eventId, dates })
        .select("code")
        .single();
      if (error) {
        setMessage({ text: friendly(error), error: true });
        return null;
      }
      setMessage({ text: "Invitación creada.", error: false });
      startRefresh(() => router.refresh());
      return data.code as string;
    },

    uploadPhoto: async (speakerId: string, file: File) => {
      const url = await store("speaker-photos", speakerId, file);
      return url !== null && run(db.from("speakers").update({ photo_url: url }).eq("id", speakerId), "Foto guardada.");
    },

    removePhoto: async (speakerId: string, url: string) => {
      await unstore("speaker-photos", url);
      return run(db.from("speakers").update({ photo_url: null }).eq("id", speakerId), "Foto quitada.");
    },

    /** Adds photos to the end of the dinner's gallery, in the order picked. */
    addEventPhotos: async (event: EventRow, files: File[]) => {
      const urls: string[] = [];
      for (const file of files) {
        const url = await store("event-photos", event.id, file);
        if (url) urls.push(url);
      }
      return urls.length > 0 && run(
        db.from("events").update({ photos: [...event.photos, ...urls] }).eq("id", event.id),
        `${urls.length} foto(s) agregadas.`,
      );
    },

    removeEventPhoto: async (event: EventRow, url: string) => {
      await unstore("event-photos", url);
      return run(db.from("events").update({ photos: event.photos.filter((p) => p !== url) }).eq("id", event.id), "Foto quitada.");
    },

    /** Moves a photo one place earlier (-1) or later (+1). The first one is the large cover. */
    moveEventPhoto: (event: EventRow, index: number, step: -1 | 1) => {
      const photos = [...event.photos];
      const to = index + step;
      if (to < 0 || to >= photos.length) return Promise.resolve(false);
      [photos[index], photos[to]] = [photos[to], photos[index]];
      return run(db.from("events").update({ photos }).eq("id", event.id));
    },
  };
}

export type AdminDb = ReturnType<typeof useAdminDb>;
