"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { browserClient } from "@/lib/supabase/browser";
import type { EventSpeaker, TableName } from "@/lib/admin/types";

type PgError = { code?: string; message: string } | null;

const PHOTOS = "speaker-photos";

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
     * With a dinner, they're added to it already confirmed.
     */
    addSpeaker: async (fields: Record<string, unknown>, eventId?: string) => {
      const { data, error } = await db
        .from("speakers")
        .insert({ ...fields, status: eventId ? "confirmed" : "contacted" })
        .select("id")
        .single();
      if (error) {
        setMessage({ text: friendly(error), error: true });
        return false;
      }
      if (!eventId) {
        setMessage({ text: "Speaker agregado.", error: false });
        startRefresh(() => router.refresh());
        return true;
      }
      return run(
        db.from("event_speakers").insert({ event_id: eventId, speaker_id: data.id, status: "confirmed", source: "admin" }),
        "Speaker agregado y confirmado.",
      );
    },

    /** Uploads to the public speaker-photos bucket and saves the URL on the speaker. */
    uploadPhoto: async (speakerId: string, file: File) => {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${speakerId}/${Date.now()}.${ext}`;
      const { error } = await db.storage.from(PHOTOS).upload(path, file, { contentType: file.type });
      if (error) {
        setMessage({ text: `No se pudo subir la foto: ${error.message}`, error: true });
        return false;
      }
      const url = db.storage.from(PHOTOS).getPublicUrl(path).data.publicUrl;
      return run(db.from("speakers").update({ photo_url: url }).eq("id", speakerId), "Foto guardada.");
    },

    removePhoto: async (speakerId: string, url: string) => {
      const path = url.split(`/${PHOTOS}/`)[1];
      if (path) await db.storage.from(PHOTOS).remove([path]);
      return run(db.from("speakers").update({ photo_url: null }).eq("id", speakerId), "Foto quitada.");
    },
  };
}

export type AdminDb = ReturnType<typeof useAdminDb>;
