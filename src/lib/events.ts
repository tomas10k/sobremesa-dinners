import "server-only";
import { cache } from "react";
import { canJoinAsSpeaker } from "./seats";
import { publicClient } from "./supabase/server";

/** A confirmed speaker as the public sees them. Name and photo are null without consent. */
export type PublicSpeaker = {
  company: string;
  role: string;
  name: string | null;
  photo_url: string | null;
};

export type PublicEvent = {
  id: string;
  number: number;
  title_es: string;
  title_en: string;
  description_es: string | null;
  description_en: string | null;
  starts_at: string | null;
  city: "berkeley" | "sf" | null;
  status: "upcoming" | "past";
  applications_open: boolean;
  speakers: PublicSpeaker[];
  /** Speaker seats still open (0 when the table is full). */
  seats_left: number;
};

type EventRow = Omit<PublicEvent, "speakers" | "seats_left"> & { speakers_needed: number };

// Shown until Supabase is connected (local dev, preview builds without env vars).
const FALLBACK: EventRow[] = [
  { id: "00000000-0000-4000-8000-000000000001", number: 1, title_es: "Emprender siendo latino", title_en: "Entrepreneurship as a Latino", description_es: null, description_en: null, starts_at: "2026-11-18T03:00:00Z", city: "berkeley", status: "upcoming", applications_open: true, speakers_needed: 3 },
  { id: "00000000-0000-4000-8000-000000000002", number: 2, title_es: "Go-to-market y estrategia", title_en: "Go-to-market & strategy", description_es: null, description_en: null, starts_at: null, city: "sf", status: "upcoming", applications_open: false, speakers_needed: 3 },
  { id: "00000000-0000-4000-8000-000000000003", number: 3, title_es: "Inteligencia artificial", title_en: "Artificial intelligence", description_es: null, description_en: null, starts_at: null, city: null, status: "upcoming", applications_open: false, speakers_needed: 3 },
];

/** Cached per request, so a page and its metadata share one query. */
export const getPublishedEvents = cache(async (): Promise<PublicEvent[]> => {
  const db = publicClient();
  if (!db) return FALLBACK.map((e) => withSpeakers(e, []));

  const [events, speakers] = await Promise.all([
    db
      .from("events")
      .select("id, number, title_es, title_en, description_es, description_en, starts_at, city, status, applications_open, speakers_needed")
      .in("status", ["upcoming", "past"])
      .order("number"),
    db.rpc("public_event_speakers"),
  ]);
  if (events.error) {
    console.error("getPublishedEvents", events.error.message);
    return [];
  }
  if (speakers.error) console.error("public_event_speakers", speakers.error.message);

  const rows = (speakers.data ?? []) as (PublicSpeaker & { event_id: string })[];
  return (events.data as EventRow[]).map((e) =>
    withSpeakers(e, rows.filter((s) => s.event_id === e.id).map(({ event_id: _, ...s }) => s)),
  );
});

function withSpeakers({ speakers_needed, ...e }: EventRow, speakers: PublicSpeaker[]): PublicEvent {
  return { ...e, speakers, seats_left: Math.max(0, speakers_needed - speakers.length) };
}

export async function getEvent(number: number): Promise<PublicEvent | null> {
  return (await getPublishedEvents()).find((e) => e.number === number) ?? null;
}

/** Upcoming events that still need speakers, for the open-seat question. */
export async function getOpenSeatEvents(): Promise<PublicEvent[]> {
  return (await getPublishedEvents()).filter(canJoinAsSpeaker);
}
