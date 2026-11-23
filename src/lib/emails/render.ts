import { dictionaries } from "@/lib/i18n";
import { TZ } from "@/lib/tz";
import { EMAIL_COPY, EMAIL_LABELS } from "./copy";
import type { EmailContext } from "./recipients";

export type Draft = { subject: string; intro: string };

// Email clients ignore most CSS: tables, inline styles, system fonts.
const INK = "#1f3a2e";
const SOFT = "#5f6f66";
const LINE = "#cfc6b2";
const LINEN = "#ece6d8";
const PAPER = "#f6f2e9";
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const DINNER_MS = 2.5 * 60 * 60 * 1000;
const MAX_EMAIL_PHOTOS = 9;
// Widths the site's image resizer accepts (Next.js defaults).
const IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920];

/** A photo resized by the site, at the smallest allowed width of at least `w` px. */
export function emailImage(site: string, src: string, w: number): string {
  const width = IMAGE_WIDTHS.find((x) => x >= w) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
  return `${site}/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function defaultDraft(ctx: Pick<EmailContext, "kind" | "lang">): Draft {
  const c = EMAIL_COPY[ctx.lang][ctx.kind];
  return { subject: c.subject, intro: c.intro };
}

/** Fills {name}, {number} and {topic}. */
export function fill(text: string, ctx: EmailContext): string {
  const topic = ctx.lang === "es" ? ctx.event.title_es : ctx.event.title_en;
  return text
    .replaceAll("{name}", ctx.firstName)
    .replaceAll("{number}", String(ctx.event.number))
    .replaceAll("{topic}", topic);
}

export function venmoLink(handle: string, amount: number, note: string): string {
  const q = new URLSearchParams({ txn: "pay", recipients: handle, amount: String(amount), note });
  return `https://account.venmo.com/payment-link?${q}`;
}

/** The community link, only while it's switched on for this dinner. */
export const whatsappLink = (e: { whatsapp_on: boolean; whatsapp_url: string | null }) =>
  e.whatsapp_on && e.whatsapp_url ? e.whatsapp_url : null;

function calendarLink(ctx: EmailContext, withAddress: boolean): string | null {
  const { starts_at, number, city, venue } = ctx.event;
  if (!starts_at) return null;
  const fmt = (ms: number) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, "");
  const start = Date.parse(starts_at);
  const where = [withAddress ? venue : null, city ? dictionaries[ctx.lang][city] : null].filter(Boolean).join(", ");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Sobremesa No. ${number}`,
    dates: `${fmt(start)}/${fmt(start + DINNER_MS)}`,
    details: `${ctx.site}/cena/${number}`,
    location: where,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function when(ctx: EmailContext): string | null {
  if (!ctx.event.starts_at) return null;
  return new Intl.DateTimeFormat(ctx.lang === "es" ? "es-MX" : "en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(ctx.event.starts_at));
}

/** The whole email, as HTML and plain text, for one recipient. */
export function renderEmail(ctx: EmailContext, draft: Draft): { subject: string; html: string; text: string } {
  const L = EMAIL_LABELS[ctx.lang];
  const copy = EMAIL_COPY[ctx.lang][ctx.kind];
  const { event, kind } = ctx;
  const city = event.city ? dictionaries[ctx.lang][event.city] : null;
  const after = kind.endsWith("_after");
  const day = kind.endsWith("_day");
  const forStudent = kind.startsWith("student");
  const note = `Sobremesa No. ${event.number}`;
  const venmo = event.venmo_handle && event.price_usd !== null ? venmoLink(event.venmo_handle, event.price_usd, note) : null;
  const html: string[] = [];
  const text: string[] = [];

  // ---- building blocks
  const label = (s: string) =>
    `<p style="margin:0 0 14px;font:600 11px/1.4 ${FONT};letter-spacing:.24em;text-transform:uppercase;color:${SOFT}">${esc(s)}</p>`;
  const para = (s: string, color = INK) =>
    `<p style="margin:0 0 14px;font:300 17px/1.6 ${FONT};color:${color}">${s}</p>`;
  const link = (href: string, s: string) => `<a href="${esc(href)}" style="color:${INK};text-decoration:underline">${esc(s)}</a>`;
  const rule = `<tr><td style="padding:28px 0"><div style="border-top:1px solid ${LINE}"></div></td></tr>`;
  const section = (inner: string) => `<tr><td>${inner}</td></tr>`;
  const button = (href: string, s: string) =>
    `<a href="${esc(href)}" style="display:inline-block;padding:15px 30px;border-radius:999px;background:${INK};color:${LINEN};font:600 13px/1 ${FONT};letter-spacing:.14em;text-transform:uppercase;text-decoration:none">${esc(s)}</a>`;
  const add = (h: string, t: string) => {
    html.push(h);
    text.push(t);
  };

  // ---- header
  add(
    section(`<table role="presentation" width="100%"><tr>
      <td style="font:600 12px/1 ${FONT};letter-spacing:.24em;text-transform:uppercase;color:${INK}">Sobremesa Dinners</td>
      <td align="right" style="font:600 12px/1 ${FONT};letter-spacing:.24em;text-transform:uppercase;color:${SOFT}">No. ${event.number}</td>
    </tr></table>`) + rule,
    `SOBREMESA DINNERS · No. ${event.number}\n`,
  );
  const heading = fill(copy.heading, ctx);
  const intro = fill(draft.intro, ctx);
  add(
    section(label(copy.eyebrow) +
      `<h1 style="margin:0 0 18px;font:500 30px/1.2 ${FONT};color:${INK}">${esc(heading)}</h1>` +
      intro.split(/\n{2,}/).map((p) => para(esc(p).replace(/\n/g, "<br>"))).join("")),
    `${heading}\n\n${intro}\n`,
  );

  // ---- when and where (before the dinner)
  if (!after) {
    const date = when(ctx);
    const showAddress = day && event.venue;
    const maps = showAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, city].filter(Boolean).join(", "))}` : null;
    const cal = calendarLink(ctx, Boolean(showAddress));
    const where = showAddress
      ? `${esc([event.venue, city].filter(Boolean).join(", "))}. ${link(maps!, L.openMaps)}`
      : `${esc(city ?? "")}${city ? ". " : ""}${esc(L.whereLater)}`;
    const box = (k: string, v: string, last = false) =>
      `<tr><td style="padding:16px 20px;${last ? "" : `border-bottom:1px solid ${LINE};`}">${label(k)}<p style="margin:0;font:300 17px/1.5 ${FONT};color:${INK}">${v}</p></td></tr>`;
    add(
      section(`<div style="height:14px"></div>`) + section(
        `<table role="presentation" width="100%" style="border:1px solid ${LINE};border-radius:8px;background:${PAPER}">` +
        (date ? box(L.when, esc(date) + (cal ? `<br>${link(cal, L.addCalendar)}` : "")) : "") +
        box(L.where, where, true) + `</table>`),
      `${L.when}: ${date ?? "—"}\n${L.where}: ${showAddress ? [event.venue, city].filter(Boolean).join(", ") : `${city ?? ""} ${L.whereLater}`}\n`,
    );
  }

  // ---- payment (students: always in "you're in", and later only if unpaid)
  if (forStudent && venmo && (kind === "student_week" || !ctx.paid)) {
    const title = kind === "student_week" ? L.pay : L.unpaid;
    add(
      rule + section(label(title) + para(esc(L.payAmount(event.price_usd!))) +
        para(esc(L.payNote(event.venmo_handle!, note)), SOFT) + button(venmo, L.payButton)),
      `${title}: ${L.payAmount(event.price_usd!)} ${L.payNote(event.venmo_handle!, note)}\n${venmo}\n`,
    );
  }
  if (kind === "student_week") {
    const url = `${ctx.site}/confirmar/${ctx.code}`;
    add(section(`<div style="height:20px"></div>` + para(esc(L.confirmNote), SOFT) + button(url, L.confirm)), `${L.confirmNote}\n${url}\n`);
  }

  // ---- what the students want to hear (speakers, before)
  if (!forStudent && !after && kind !== "speaker_confirmed" && event.hear_points.length) {
    add(
      rule + section(label(L.hear) + `<table role="presentation" width="100%">` +
        event.hear_points.map((p, i) =>
          `<tr><td valign="top" style="width:28px;font:600 17px/1.6 ${FONT};color:${INK}">${i + 1}</td><td>${para(esc(p))}</td></tr>`).join("") +
        `</table>`),
      `${L.hear}:\n${event.hear_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`,
    );
  }

  // ---- the other speakers (speakers, before)
  if (!forStudent && !after && kind !== "speaker_confirmed" && ctx.speakers.length) {
    const title = L.fellow;
    add(
      rule + section(label(title) + ctx.speakers.map((s, i) =>
        `<div style="padding:${i ? "18px" : "0"} 0 18px;${i < ctx.speakers.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}">` +
        `<p style="margin:0 0 6px;font:600 18px/1.4 ${FONT};color:${INK}">${esc(s.name)}</p>` +
        para(esc(s.bio || [s.role, s.company].filter(Boolean).join(", ")) +
          (s.linkedin_url ? ` ${link(s.linkedin_url, L.viewProfile)}` : ""), SOFT) +
        `</div>`).join("")),
      `${title}:\n${ctx.speakers.map((s) => `- ${s.name}: ${s.bio || [s.role, s.company].filter(Boolean).join(", ")}${s.linkedin_url ? ` (${s.linkedin_url})` : ""}`).join("\n")}\n`,
    );
  }

  // ---- students (speakers, before)
  if (!forStudent && !after && kind !== "speaker_confirmed" && ctx.students.length) {
    add(
      rule + section(label(L.students(ctx.students.length)) + ctx.students.map((s, i) =>
        `<div style="padding:12px 0;${i < ctx.students.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}">` +
        `<p style="margin:0 0 2px;font:600 16px/1.4 ${FONT};color:${INK}">${esc(s.name)}</p>` +
        `<p style="margin:0;font:300 15px/1.5 ${FONT};color:${SOFT}">${esc(L.year(s.year))}.${s.linkedin_url ? ` ${link(s.linkedin_url, L.profile)}` : ""}</p>` +
        `</div>`).join("")),
      `${L.students(ctx.students.length)}:\n${ctx.students.map((s) => `- ${s.name}, ${L.year(s.year)}${s.linkedin_url ? ` (${s.linkedin_url})` : ""}`).join("\n")}\n`,
    );
  }

  // ---- after: photos, then feedback
  if (after) {
    const page = `${ctx.site}/cena/${event.number}`;
    if (event.photos.length) {
      // Every photo (up to 9): the first large, the rest in pairs. Served through the
      // site's image resizer so the email loads fast instead of pulling full-size photos.
      const [lead, ...rest] = event.photos.slice(0, MAX_EMAIL_PHOTOS);
      const img = (src: string, w: number) =>
        `<a href="${esc(page)}"><img src="${esc(emailImage(ctx.site, src, w * 2))}" width="${w}" alt="" style="display:block;width:100%;max-width:${w}px;height:auto;border-radius:4px"></a>`;
      const pairs: string[][] = [];
      for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));
      add(
        rule + section(label(L.photos) + img(lead, 600) +
          pairs.map((pair) => `<table role="presentation" width="100%" style="margin-top:8px"><tr>${pair.map((p, i) =>
            `<td width="50%" valign="top" style="padding:${i ? "0 0 0 4px" : "0 4px 0 0"}">${img(p, 296)}</td>`).join("")}` +
            (pair.length === 1 ? `<td width="50%"></td>` : "") + `</tr></table>`).join("") +
          `<p style="margin:14px 0 0;font:300 15px/1.5 ${FONT}">${link(page, L.seeMore)}</p>`),
        `${L.photos}: ${page}\n`,
      );
    }
    const url = `${ctx.site}/feedback/${ctx.code}`;
    add(rule + section(label(L.feedback) + para(esc(L.feedbackIntro)) + `<div style="height:6px"></div>` + button(url, L.feedbackButton)),
      `${L.feedback}: ${L.feedbackIntro}\n${url}\n`);
    const wa = whatsappLink(event);
    if (wa) {
      add(rule + section(label(L.whatsapp) + para(esc(L.whatsappIntro)) + `<div style="height:6px"></div>` + button(wa, L.whatsappButton)),
        `${L.whatsapp}: ${L.whatsappIntro}\n${wa}\n`);
    }
  }

  // ---- sign-off and footer
  const sign = after ? L.signAfter : L.signBefore;
  add(
    rule + section(para(esc(L.questions), SOFT) + `<div style="height:8px"></div>` +
      para(`${esc(sign)}<br><strong style="font-weight:600">${esc(L.signers)}</strong><br><span style="color:${SOFT}">Sobremesa Dinners</span>`)) +
      rule + section(`<p style="margin:0;font:300 13px/1.5 ${FONT};color:${SOFT}">${esc(L.more)} ${link(ctx.site, ctx.site.replace(/^https?:\/\//, ""))}</p>`),
    `${L.questions}\n\n${sign}\n${L.signers}\nSobremesa Dinners\n\n${L.more} ${ctx.site}`,
  );

  const subject = fill(draft.subject, ctx);
  return {
    subject,
    text: text.join("\n"),
    html: `<!doctype html><html lang="${ctx.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light only"><title>${esc(subject)}</title></head>` +
      `<body style="margin:0;padding:0;background:${LINEN}"><table role="presentation" width="100%" style="background:${LINEN}"><tr><td align="center" style="padding:40px 16px">` +
      `<table role="presentation" width="100%" style="max-width:600px">${html.join("")}</table>` +
      `</td></tr></table></body></html>`,
  };
}
