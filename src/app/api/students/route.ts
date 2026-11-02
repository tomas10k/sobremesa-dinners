import { studentSchema } from "@/lib/schemas";
import { serviceClient } from "@/lib/supabase/server";
import { invalid, notConfigured, readJson, serverError } from "@/lib/api";

export async function POST(req: Request) {
  const parsed = studentSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();

  const { website, ...student } = parsed.data;

  // Only dinners with applications open accept students, whatever the client sends.
  const { data: event, error: eventError } = await db
    .from("events")
    .select("id")
    .eq("id", student.event_id)
    .eq("applications_open", true)
    .neq("status", "draft")
    .maybeSingle();
  if (eventError) return serverError("students.event", eventError.message);
  if (!event) return Response.json({ error: "invalid", fields: { event_id: "closed" } }, { status: 400 });

  const { error } = await db.from("students").insert(student);
  if (error?.code === "23505") return Response.json({ error: "duplicate" }, { status: 409 });
  if (error) return serverError("students.insert", error.message);

  return Response.json({ ok: true }, { status: 201 });
}
