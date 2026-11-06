import { speakerSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";
import { invalid, notConfigured, readJson, serverError } from "@/lib/api";

export async function POST(req: Request) {
  const parsed = speakerSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();

  const { seats, referrals, website, weeks, ...speaker } = parsed.data;
  const motivation_other = speaker.motivations.includes("other") ? speaker.motivation_other : undefined;

  const { data, error } = await db
    .from("speakers")
    .insert({ ...speaker, available_weeks: weeks, motivation_other })
    .select("id")
    .single();
  if (error) return serverError("speakers.insert", error.message);

  if (seats.length) {
    const { error: seatError } = await db.from("event_speakers").insert(
      seats.map((s) => ({
        event_id: s.event_id,
        speaker_id: data.id,
        status: s.answer === "yes" ? "interested" : "maybe",
        source: "form",
      })),
    );
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
