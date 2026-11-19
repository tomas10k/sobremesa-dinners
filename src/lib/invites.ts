import "server-only";
import { serviceClient } from "./supabase/server";

/** What the invite page shows: the speaker's first name, the dinner, and the proposed dates. */
export type PublicInvite = {
  code: string;
  firstName: string;
  dates: string[];
  response: "pending" | "accepted" | "declined";
  chosen_date: string | null;
  message: string | null;
  event: {
    number: number;
    title_es: string;
    title_en: string;
    description_es: string | null;
    description_en: string | null;
    city: "berkeley" | "sf" | null;
  } | null;
};

/** Invites are private: looked up by their unguessable code with the server-only key. */
export async function getInvite(code: string): Promise<PublicInvite | null> {
  const db = serviceClient();
  if (!db || !/^[0-9a-f]{16}$/.test(code)) return null;
  const { data, error } = await db
    .from("invites")
    .select("code, dates, response, chosen_date, message, speakers(name), events(number, title_es, title_en, description_es, description_en, city)")
    .eq("code", code)
    .maybeSingle();
  if (error) console.error("getInvite", error.message);
  if (!data) return null;
  const { speakers, events, ...invite } = data as unknown as Omit<PublicInvite, "firstName" | "event"> & {
    speakers: { name: string } | null;
    events: PublicInvite["event"];
  };
  return { ...invite, firstName: speakers?.name.trim().split(/\s+/)[0] ?? "", event: events };
}
