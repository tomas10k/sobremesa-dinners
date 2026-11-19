import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "./supabase/server";

/** What a guest's personal page (confirm a seat, give feedback) shows. */
export type Guest = {
  type: "student" | "speaker";
  id: string;
  code: string;
  firstName: string;
  /** Students only: where they stand. */
  status: string | null;
  paid: boolean;
  dietary: string | null;
  seatConfirmed: boolean;
  event: {
    id: string;
    number: number;
    title_es: string;
    title_en: string;
    starts_at: string | null;
    city: "berkeley" | "sf" | null;
    price_usd: number | null;
    venmo_handle: string | null;
  };
  feedback: Record<string, unknown> | null;
};

const EVENT = "id, number, title_es, title_en, starts_at, city, price_usd, venmo_handle";
const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Finds a student or a speaker by their personal code (server key; codes are unguessable). */
export async function findGuest(code: string, db: SupabaseClient | null = serviceClient()): Promise<Guest | null> {
  if (!db || !/^[0-9a-f]{16}$/.test(code)) return null;

  const { data: student } = await db
    .from("students")
    .select(`id, code, name, status, paid, dietary, seat_confirmed_at, events(${EVENT})`)
    .eq("code", code)
    .maybeSingle();
  if (student) {
    const event = student.events as unknown as Guest["event"];
    const { data: feedback } = await db.from("feedback").select("*").eq("student_id", student.id).eq("event_id", event.id).maybeSingle();
    return {
      type: "student", id: student.id, code, firstName: first(student.name), status: student.status,
      paid: student.paid, dietary: student.dietary, seatConfirmed: Boolean(student.seat_confirmed_at), event, feedback,
    };
  }

  const { data: link } = await db
    .from("event_speakers")
    .select(`code, speakers(id, name), events(${EVENT})`)
    .eq("code", code)
    .maybeSingle();
  if (!link) return null;
  const speaker = link.speakers as unknown as { id: string; name: string };
  const event = link.events as unknown as Guest["event"];
  const { data: feedback } = await db.from("feedback").select("*").eq("speaker_id", speaker.id).eq("event_id", event.id).maybeSingle();
  return {
    type: "speaker", id: speaker.id, code, firstName: first(speaker.name), status: null,
    paid: true, dietary: null, seatConfirmed: true, event, feedback,
  };
}
