import { invalid, notConfigured, rateLimited, readJson, serverError } from "@/lib/api";
import { findGuest } from "@/lib/guests";
import { feedbackSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";

const OPTIONAL = ["food", "come_back", "more_of", "less_of", "improve", "refer", "highlight"] as const;

/** Feedback from a speaker's or student's personal link. Sending again updates it. */
export async function POST(req: Request) {
  const parsed = feedbackSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();
  const limited = await rateLimited(req, db, "feedback");
  if (limited) return limited;

  const { code, website: _, ...answers } = parsed.data;
  const guest = await findGuest(code, db);
  if (!guest) return Response.json({ error: "not_found" }, { status: 404 });

  const by = guest.type === "student" ? "student_id" : "speaker_id";
  const { error } = await db.from("feedback").upsert(
    {
      event_id: guest.event.id,
      [by]: guest.id,
      overall: answers.overall,
      quote_ok: answers.quote_ok,
      // Answers left blank on an edit are cleared, not kept.
      ...Object.fromEntries(OPTIONAL.map((k) => [k, answers[k] ?? null])),
      updated_at: new Date().toISOString(),
    },
    { onConflict: `event_id,${by}` },
  );
  if (error) return serverError("feedback.upsert", error.message);
  return Response.json({ ok: true });
}
