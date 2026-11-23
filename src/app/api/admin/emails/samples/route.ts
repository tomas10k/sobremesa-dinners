import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { invalid, notConfigured, readJson } from "@/lib/api";
import type { EventRow } from "@/lib/admin/types";
import { loadEmailData } from "@/lib/emails/load";
import { emailContext, recipientsFor, type Recipient } from "@/lib/emails/recipients";
import { defaultDraft, renderEmail } from "@/lib/emails/render";
import { EMAIL_KINDS } from "@/lib/emails/schedule";
import { sendEmails } from "@/lib/emails/send";
import { ADMIN_EMAILS, SITE_URL } from "@/lib/site";
import { serviceClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  event_id: z.string().uuid().optional(),
  lang: z.enum(["es", "en"]).default("es"),
});

// Visible stand-ins for what a dinner hasn't filled in yet, so every section shows.
const EXAMPLE = {
  venue: "100 Example Street",
  price_usd: 18,
  venmo_handle: "TU-VENMO",
  whatsapp_url: "https://chat.whatsapp.com/EJEMPLO",
  hear_points: [
    "How you made the leap into founding: from a job or a venture fund to your own company.",
    "What it is really like to build in the US as a Latino or an immigrant: the networks, and what turned into an advantage.",
    "The full story, including the mistakes and doubts that rarely come up on a panel.",
  ],
};

/**
 * Sends Daniela and Tomás one sample of each of a dinner's 7 emails, as a real
 * guest would get them, in one language. Nothing reaches guests and nothing is logged.
 * Callable from the admin, or with the cron secret.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const viaSecret = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
  let db;
  if (viaSecret) {
    db = serviceClient();
    if (!db) return notConfigured();
  } else {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    db = auth.db;
  }
  const parsed = bodySchema.safeParse(await readJson(req));
  if (!parsed.success) return invalid(parsed.error);
  const { event_id, lang } = parsed.data;

  try {
    const data = await loadEmailData(db);
    const real = event_id ? data.events.find((e) => e.id === event_id) : [...data.events].sort((a, b) => a.number - b.number)[0];
    if (!real) return Response.json({ error: "not_found" }, { status: 404 });
    const event: EventRow = {
      ...real,
      venue: real.venue ?? EXAMPLE.venue,
      price_usd: real.price_usd ?? EXAMPLE.price_usd,
      venmo_handle: real.venmo_handle ?? EXAMPLE.venmo_handle,
      hear_points: real.hear_points.length ? real.hear_points : EXAMPLE.hear_points,
      whatsapp_on: true,
      whatsapp_url: real.whatsapp_url ?? EXAMPLE.whatsapp_url,
    };

    // The wording as last edited in the admin for this dinner, if any.
    const { data: savedDrafts } = await db.from("email_drafts").select("kind, subject, intro").eq("event_id", real.id).eq("lang", lang);
    const drafts = savedDrafts ?? [];
    const emails = EMAIL_KINDS.map((kind) => {
      const first = recipientsFor(kind, event, data)[0];
      const sample: Recipient = {
        id: first?.id ?? "sample", name: first?.name ?? "Ana López", email: null, lang,
        code: first?.code ?? "0000000000000000", paid: false, sentAt: null,
      };
      const saved = drafts.find((d) => d.kind === kind);
      const draft = saved ? { subject: saved.subject, intro: saved.intro } : defaultDraft({ kind, lang });
      return renderEmail(emailContext(kind, event, sample, data, SITE_URL), draft);
    });
    await sendEmails(ADMIN_EMAILS.flatMap((to) => emails.map((e, i) => ({
      ...e, to, subject: `[Muestra ${i + 1}/7] ${e.subject}`,
    }))));
    return Response.json({ sent: emails.length, to: ADMIN_EMAILS });
  } catch (err) {
    const message = (err as Error).message;
    console.error("admin.emails.samples", message);
    return Response.json({ error: "server", message }, { status: 500 });
  }
}
