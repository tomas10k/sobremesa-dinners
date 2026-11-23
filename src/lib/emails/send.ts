import "server-only";
import { ADMIN_EMAILS } from "@/lib/site";

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

const FROM = process.env.EMAIL_FROM ?? "Sobremesa Dinners <hola@sobremesadinners.com>";

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Sends through Resend, up to 100 per call. Replies go to both founders' Gmails.
 * Returns the provider id of each email, in order.
 */
export async function sendEmails(emails: OutgoingEmail[]): Promise<string[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY: el envío de correos no está configurado.");
  const ids: string[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        emails.slice(i, i + 100).map((e) => ({ from: FROM, ...(ADMIN_EMAILS.length ? { reply_to: ADMIN_EMAILS } : {}), to: [e.to], subject: e.subject, html: e.html, text: e.text })),
      ),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${res.status}: ${body.message ?? "error"}`);
    ids.push(...(body.data as { id: string }[]).map((d) => d.id));
  }
  return ids;
}
