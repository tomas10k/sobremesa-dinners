import { loadEmailData } from "@/lib/emails/load";
import { dueToday } from "@/lib/emails/due";
import { KIND_LABEL } from "@/lib/emails/schedule";
import { sendEmails } from "@/lib/emails/send";
import { ADMIN_EMAILS, SITE_URL } from "@/lib/site";
import { serviceClient } from "@/lib/supabase/server";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Every morning (see vercel.json): tells Daniela and Tomás which guest emails are due
 * and who hasn't paid. It never emails guests itself; the admins review and send.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = serviceClient();
  if (!db) return Response.json({ error: "not_configured" }, { status: 503 });

  const { emails, unpaid } = dueToday(await loadEmailData(db));
  if (!emails.length && !unpaid.length) return Response.json({ ok: true, due: 0 });

  const open = (eventId: string, kind?: string) =>
    `${SITE_URL}/admin?cena=${eventId}${kind ? `&correo=${kind}` : ""}`;
  const lines = [
    ...emails.map((d) => ({
      text: `No. ${d.event.number} — ${KIND_LABEL[d.kind]}: ${d.pending} por enviar${d.needsPhotos ? " (sube las fotos primero)" : ""}`,
      href: open(d.event.id, d.kind),
    })),
    ...unpaid.map(({ event, student }) => ({
      text: `No. ${event.number} — ${student.name} no ha pagado (48 h desde “Tienes lugar”)`,
      href: open(event.id),
    })),
  ];
  const subject = `Sobremesa: ${lines.length} pendiente${lines.length === 1 ? "" : "s"} para hoy`;
  const html =
    `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1f3a2e">` +
    `<p>Buenos días. Esto toca hoy:</p><ul>` +
    lines.map((l) => `<li><a href="${l.href}" style="color:#1f3a2e">${esc(l.text)}</a></li>`).join("") +
    `</ul><p style="color:#5f6f66">Cada link abre la cena en el admin, con el correo listo para revisar y enviar.</p></div>`;
  const text = `Esto toca hoy:\n\n${lines.map((l) => `- ${l.text}\n  ${l.href}`).join("\n")}`;

  await sendEmails(ADMIN_EMAILS.map((to) => ({ to, subject, html, text })));
  return Response.json({ ok: true, due: lines.length });
}
