import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailData } from "./recipients";

/** Everything the emails read, from an admin session or the server key. */
export async function loadEmailData(db: SupabaseClient, eventId?: string): Promise<EmailData> {
  const forEvent = (table: string) => {
    const q = db.from(table).select("*");
    return eventId ? q.eq("event_id", eventId) : q;
  };
  const [events, speakers, students, eventSpeakers, emailLog] = await Promise.all([
    eventId ? db.from("events").select("*").eq("id", eventId) : db.from("events").select("*"),
    db.from("speakers").select("*"),
    forEvent("students"),
    forEvent("event_speakers"),
    forEvent("email_log"),
  ]);
  const error = [events, speakers, students, eventSpeakers, emailLog].find((r) => r.error)?.error;
  if (error) throw new Error(error.message);
  return {
    events: events.data ?? [],
    speakers: speakers.data ?? [],
    students: students.data ?? [],
    eventSpeakers: eventSpeakers.data ?? [],
    emailLog: emailLog.data ?? [],
  } as EmailData;
}
