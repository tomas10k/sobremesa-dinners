import { invalid, notConfigured, readJson, serverError } from "@/lib/api";
import { confirmSeatSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";

/** A student confirms their seat (and dietary needs) from their "you're in" email. */
export async function POST(req: Request) {
  const parsed = confirmSeatSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();

  const { code, dietary } = parsed.data;
  const { data: student, error } = await db
    .from("students")
    .select("id, status, seat_confirmed_at")
    .eq("code", code)
    .maybeSingle();
  if (error) return serverError("confirm.find", error.message);
  if (!student) return Response.json({ error: "not_found" }, { status: 404 });
  // Only someone the admins accepted can confirm; a waitlisted link does nothing.
  if (!["accepted", "confirmed"].includes(student.status)) return Response.json({ error: "closed" }, { status: 409 });

  const { error: updateError } = await db
    .from("students")
    .update({ status: "confirmed", dietary: dietary ?? null, seat_confirmed_at: student.seat_confirmed_at ?? new Date().toISOString() })
    .eq("id", student.id);
  if (updateError) return serverError("confirm.update", updateError.message);
  return Response.json({ ok: true });
}
