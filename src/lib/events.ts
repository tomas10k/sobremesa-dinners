import "server-only";
import { publicClient } from "./supabase/server";

export type PublicEvent = {
  id: string;
  number: number;
  title_es: string;
  title_en: string;
  starts_at: string | null;
  city: "berkeley" | "sf" | null;
  status: "upcoming" | "past";
  applications_open: boolean;
};

// Shown until Supabase is connected (local dev, preview builds without env vars).
const FALLBACK: PublicEvent[] = [
  { id: "00000000-0000-4000-8000-000000000001", number: 1, title_es: "Emprender siendo latino", title_en: "Entrepreneurship as a Latino", starts_at: "2026-11-18T03:00:00Z", city: "berkeley", status: "upcoming", applications_open: true },
  { id: "00000000-0000-4000-8000-000000000002", number: 2, title_es: "Go-to-market y estrategia", title_en: "Go-to-market & strategy", starts_at: null, city: "sf", status: "upcoming", applications_open: false },
  { id: "00000000-0000-4000-8000-000000000003", number: 3, title_es: "Inteligencia artificial", title_en: "Artificial intelligence", starts_at: null, city: null, status: "upcoming", applications_open: false },
];

export async function getPublishedEvents(): Promise<PublicEvent[]> {
  const db = publicClient();
  if (!db) return FALLBACK;
  const { data, error } = await db
    .from("events")
    .select("id, number, title_es, title_en, starts_at, city, status, applications_open")
    .in("status", ["upcoming", "past"])
    .order("number");
  if (error) {
    console.error("getPublishedEvents", error.message);
    return [];
  }
  return data as PublicEvent[];
}

/** Upcoming events that still need speakers, for the open-seat question. */
export async function getOpenSeatEvents(): Promise<PublicEvent[]> {
  const db = publicClient();
  const events = await getPublishedEvents();
  if (!db) return events.filter((e) => e.status === "upcoming");
  const { data, error } = await db.rpc("open_speaker_seats");
  if (error) {
    console.error("getOpenSeatEvents", error.message);
    return [];
  }
  const open = new Set((data as { event_id: string }[]).map((r) => r.event_id));
  return events.filter((e) => open.has(e.id));
}
