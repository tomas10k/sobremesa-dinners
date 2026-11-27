import { invalid, notConfigured, rateLimited, readJson, serverError } from "@/lib/api";
import { emailConfigured, sendEmails } from "@/lib/emails/send";
import { confirmSeatSchema } from "@/lib/schemas";
import { ADMIN_EMAILS, SITE_URL } from "@/lib/site";
import { serviceClient } from "@/lib/supabase/server";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** A student confirms their seat (and dietary needs) from their "you're in" email. */
export async function POST(req: Request) {
  const parsed = confirmSeatSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const db = serviceClient();
  if (!db) return notConfigured();
  const limited = await rateLimited(req, db, "confirm");
  if (limited) return limited;

  const { code, dietary } = parsed.data;
  const { data: student, error } = await db
    .from("students")
    .select("id, name, status, paid, seat_confirmed_at, events(number)")
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

  // The first time they confirm, tell the admins. A failed notice must not undo the confirmation.
  if (!student.seat_confirmed_at && emailConfigured() && ADMIN_EMAILS.length) {
    const number = (student.events as unknown as { number: number } | null)?.number;
    const lines = [
      `${student.name} confirmó su lugar en Sobremesa No. ${number}.`,
      dietary ? `Restricción alimentaria: ${dietary}` : "Sin restricciones alimentarias.",
      student.paid ? "Ya está marcado como pagado." : "Todavía no está marcado como pagado.",
    ];
    try {
      await sendEmails(ADMIN_EMAILS.map((to) => ({
        to,
        subject: `✓ ${student.name} confirmó: Sobremesa No. ${number}`,
        text: `${lines.join("\n")}\n\n${SITE_URL}/admin`,
        html: `<p style="font:16px/1.6 Helvetica,Arial,sans-serif">${lines.map(esc).join("<br>")}</p>` +
          `<p style="font:16px/1.6 Helvetica,Arial,sans-serif"><a href="${SITE_URL}/admin">Abrir el admin</a></p>`,
      })));
    } catch (err) {
      console.error("confirm.notify", (err as Error).message);
    }
  }
  return Response.json({ ok: true });
}
