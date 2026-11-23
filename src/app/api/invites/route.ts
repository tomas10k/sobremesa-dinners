import { inviteAnswerSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";
import { invalid, notConfigured, rateLimited, readJson, serverError } from "@/lib/api";

/** A speaker answers their invite: one of the proposed dates, or none. They can change it later. */
export async function POST(req: Request) {
  const parsed = inviteAnswerSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();
  const limited = await rateLimited(req, db, "invites");
  if (limited) return limited;

  const { code, date, message } = parsed.data;
  const { data: invite, error } = await db.from("invites").select("id, dates").eq("code", code).maybeSingle();
  if (error) return serverError("invites.find", error.message);
  if (!invite) return Response.json({ error: "not_found" }, { status: 404 });
  if (date && !(invite.dates as string[]).includes(date)) {
    return Response.json({ error: "invalid", fields: { date: "invalid" } }, { status: 400 });
  }

  const { error: updateError } = await db
    .from("invites")
    .update({
      response: date ? "accepted" : "declined",
      chosen_date: date,
      message: message ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", invite.id);
  if (updateError) return serverError("invites.update", updateError.message);

  return Response.json({ ok: true });
}
