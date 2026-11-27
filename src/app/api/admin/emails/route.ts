import { requireAdmin } from "@/lib/admin/auth";
import { invalid, readJson } from "@/lib/api";
import { loadEmailData } from "@/lib/emails/load";
import { emailContext, recipientsFor } from "@/lib/emails/recipients";
import { renderEmail } from "@/lib/emails/render";
import { audienceOf } from "@/lib/emails/schedule";
import { sendEmails } from "@/lib/emails/send";
import { sendEmailsSchema } from "@/lib/schemas";
import { SITE_URL } from "@/lib/site";

/**
 * Sends one of a dinner's emails to the chosen recipients, or a test copy to the admin.
 * Everything is rebuilt from the database here; the browser only says who and the wording.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = sendEmailsSchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const { event_id, kind, recipient_ids, drafts, test, lang } = parsed.data;

  try {
    const data = await loadEmailData(auth.db, event_id);
    const event = data.events[0];
    if (!event) return Response.json({ error: "not_found" }, { status: 404 });
    // A test goes to the admin, so the person previewed doesn't need an email of their own.
    const chosen = recipientsFor(kind, event, data).filter((r) => recipient_ids.includes(r.id) && (test || r.email));
    if (!chosen.length) return Response.json({ error: "no_recipients" }, { status: 400 });

    const render = (r: (typeof chosen)[number]) => renderEmail(emailContext(kind, event, r, data, SITE_URL), drafts[r.lang]);

    if (test) {
      // In the language the admin was looking at, not necessarily the guest's.
      const sample = render(lang ? { ...chosen[0], lang } : chosen[0]);
      await sendEmails([{ ...sample, to: auth.email, subject: `[Prueba] ${sample.subject}` }]);
      return Response.json({ sent: 0, test: auth.email });
    }

    const ids = await sendEmails(chosen.map((r) => ({ ...render(r), to: r.email! })));
    const by = audienceOf(kind) === "speakers" ? "speaker_id" : "student_id";
    const [log, saved] = await Promise.all([
      auth.db.from("email_log").insert(chosen.map((r, i) => ({
        event_id, kind, [by]: r.id, email: r.email, sent_by: auth.email, provider_id: ids[i] ?? null,
      }))),
      auth.db.from("email_drafts").upsert(
        (["es", "en"] as const).map((lang) => ({ event_id, kind, lang, ...drafts[lang], updated_at: new Date().toISOString() })),
      ),
    ]);
    // The emails are out; a logging failure must not make the admin resend them.
    if (log.error) console.error("email_log.insert", log.error.message);
    if (saved.error) console.error("email_drafts.upsert", saved.error.message);
    return Response.json({ sent: chosen.length });
  } catch (err) {
    // Admin-only, so say what went wrong (e.g. the sending domain isn't verified yet).
    const message = (err as Error).message;
    console.error("admin.emails", message);
    return Response.json({ error: "server", message }, { status: 500 });
  }
}
