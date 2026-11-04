import { speakerSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";
import { invalid, notConfigured, readJson, serverError } from "@/lib/api";

export async function POST(req: Request) {
  const parsed = speakerSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();

  const { event_id, seats, referrals, website, weeks, ...speaker } = parsed.data;
  const motivation_other = speaker.motivations.includes("other") ? speaker.motivation_other : undefined;

  // Joining a specific dinner: only while it is upcoming and still has a speaker seat.
  let joining: { id: string; city: string | null } | null = null;
  if (event_id) {
    const [{ data: event, error: eventError }, { data: open, error: openError }] = await Promise.all([
      db.from("events").select("id, city").eq("id", event_id).eq("status", "upcoming").maybeSingle(),
      db.rpc("open_speaker_seats"),
    ]);
    if (eventError || openError) return serverError("speakers.event", (eventError ?? openError)!.message);
    if (!event || !(open as { event_id: string }[]).some((o) => o.event_id === event_id)) {
      return Response.json({ error: "full" }, { status: 409 });
    }
    joining = event;
  }

  const { data, error } = await db
    .from("speakers")
    .insert({
      ...speaker,
      cities: joining?.city ? [joining.city] : speaker.cities,
      available_weeks: weeks,
      motivation_other,
    })
    .select("id")
    .single();
  if (error) return serverError("speakers.insert", error.message);

  const links = joining
    ? [{ event_id: joining.id, speaker_id: data.id, status: "interested", source: "form" }]
    : seats.map((s) => ({
        event_id: s.event_id,
        speaker_id: data.id,
        status: s.answer === "yes" ? "interested" : "maybe",
        source: "form",
      }));
  if (links.length) {
    const { error: seatError } = await db.from("event_speakers").insert(links);
    if (seatError) console.error("event_speakers.insert", seatError.message);
  }

  if (referrals.length) {
    const { error: refError } = await db
      .from("referrals")
      .insert(referrals.map((r) => ({ ...r, referred_by: data.id })));
    if (refError) console.error("referrals.insert", refError.message);
  }

  return Response.json({ ok: true }, { status: 201 });
}
