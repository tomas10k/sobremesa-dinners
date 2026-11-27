import { googleCalendarUrl } from "@/lib/calendar";
import { dictionaries } from "@/lib/i18n";
import { TZ } from "@/lib/tz";
import { EMAIL_COPY, EMAIL_LABELS } from "./copy";
import type { EmailContext } from "./recipients";
import { dueAt } from "./schedule";

export type Draft = { subject: string; intro: string };

// The look of Daniela's first "You're in": white page, one ink color, bordered boxes,
// full-width buttons. Email clients ignore most CSS, so it's tables and inline styles.
// Spacing rule: nothing has a bottom margin; gaps come only from `gap()` and `rule`,
// so every divider sits the same distance from the text above and below it.
const INK = "#1f3a2e";
const TEXT = "#1d2420";
const SOFT = "#5f6b64";
const LINE = "#dcdcd6";
const WHITE = "#ffffff";
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
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

/** Fills {name}, {number}, {topic} and {seats} (how many students have a seat). */
export function fill(text: string, ctx: EmailContext): string {
  const topic = ctx.lang === "es" ? ctx.event.title_es : ctx.event.title_en;
  return text
    .replaceAll("{name}", ctx.firstName)
    .replaceAll("{number}", String(ctx.event.number))
    .replaceAll("{topic}", topic)
    .replaceAll("{seats}", String(ctx.students.length));
}

export function venmoLink(handle: string, amount: number, note: string): string {
  const q = new URLSearchParams({ txn: "pay", recipients: handle, amount: String(amount), note });
  return `https://account.venmo.com/payment-link?${q}`;
}

/** How a dinner is paid for, if it's set up: Zelle first, then Venmo. */
export function paymentOf(e: Pick<EmailContext["event"], "price_usd" | "zelle" | "venmo_handle">):
  { method: "Zelle"; to: string; price: number } | { method: "Venmo"; to: string; price: number } | null {
  if (e.price_usd === null) return null;
  if (e.zelle) return { method: "Zelle", to: e.zelle, price: e.price_usd };
  if (e.venmo_handle) return { method: "Venmo", to: e.venmo_handle, price: e.price_usd };
  return null;
}

/** The community link, only while it's switched on for this dinner. */
export const whatsappLink = (e: { whatsapp_on: boolean; whatsapp_url: string | null }) =>
  e.whatsapp_on && e.whatsapp_url ? e.whatsapp_url : null;

const dateFmt = (lang: EmailContext["lang"], opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(lang === "es" ? "es-MX" : "en-US", { timeZone: TZ, ...opts });

function when(ctx: EmailContext): string | null {
  if (!ctx.event.starts_at) return null;
  return dateFmt(ctx.lang, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" })
    .format(new Date(ctx.event.starts_at));
}

// ---------------------------------------------------------------- building blocks
const gap = (px: number) => `<div style="height:${px}px;line-height:${px}px;font-size:1px">&nbsp;</div>`;
const rule = `<tr><td style="padding:32px 0"><div style="height:1px;line-height:1px;font-size:1px;background:${LINE}">&nbsp;</div></td></tr>`;
const row = (inner: string) => `<tr><td>${inner}</td></tr>`;
const label = (s: string) =>
  `<p style="margin:0;font:500 12px/1.4 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:${SOFT}">${esc(s)}</p>`;
const para = (html: string, color = TEXT) => `<p style="margin:0;font:400 17px/1.6 ${FONT};color:${color}">${html}</p>`;
const paras = (text: string) => text.split(/\n{2,}/).map((p) => para(esc(p).replace(/\n/g, "<br>"))).join(gap(14));
const link = (href: string, s: string) => `<a href="${esc(href)}" style="color:${INK};text-decoration:underline">${esc(s)}</a>`;
const button = (href: string, s: string, outline = false) =>
  `<a href="${esc(href)}" style="display:block;text-align:center;padding:17px 24px;border-radius:999px;` +
  (outline ? `border:1.5px solid ${INK};background:${WHITE};color:${INK};` : `border:1.5px solid ${INK};background:${INK};color:${WHITE};`) +
  `font:700 17px/1.2 ${FONT};text-decoration:none">${esc(s)}</a>`;
/** A bordered box of labeled rows, like WHEN / WHERE / TOPIC. */
const box = (rows: [string, string][]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid ${INK};border-radius:14px;border-collapse:separate">` +
  rows.map(([k, v], i) =>
    `<tr><td style="padding:18px 22px;${i < rows.length - 1 ? `border-bottom:1px solid ${LINE};` : ""}">${label(k)}${gap(6)}` +
    `<p style="margin:0;font:400 18px/1.5 ${FONT};color:${TEXT}">${v}</p></td></tr>`).join("") +
  `</table>`;
/** People with a line about them, separated by thin lines. */
const people = (list: { name: string; line: string }[]) =>
  list.map((p, i) =>
    (i ? `<div style="height:1px;line-height:1px;font-size:1px;background:${LINE};margin:20px 0">&nbsp;</div>` : "") +
    `<p style="margin:0;font:700 19px/1.4 ${FONT};color:${INK}">${esc(p.name)}</p>${gap(4)}` +
    `<p style="margin:0;font:400 16px/1.55 ${FONT};color:${SOFT}">${p.line}</p>`).join("");
const numbered = (items: string[]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
  items.map((s, i) =>
    `<tr><td valign="top" style="width:30px;padding:${i ? "14px" : "0"} 0 0;font:700 17px/1.6 ${FONT};color:${INK}">${i + 1}</td>` +
    `<td style="padding:${i ? "14px" : "0"} 0 0">${para(s)}</td></tr>`).join("") +
  `</table>`;

/** The whole email, as HTML and plain text, for one recipient. */
export function renderEmail(ctx: EmailContext, draft: Draft): { subject: string; html: string; text: string } {
  const L = EMAIL_LABELS[ctx.lang];
  const copy = EMAIL_COPY[ctx.lang][ctx.kind];
  const { event, kind } = ctx;
  const city = event.city ? dictionaries[ctx.lang][event.city] : null;
  const topic = ctx.lang === "es" ? event.title_es : event.title_en;
  const after = kind.endsWith("_after");
  const day = kind.endsWith("_day");
  const forStudent = kind.startsWith("student");
  const note = `Sobremesa No. ${event.number}`;
  const pay = paymentOf(event);
  const html: string[] = [];
  const text: string[] = [];
  const add = (h: string, t: string) => {
    html.push(h);
    text.push(t);
  };

  // ---- header
  add(
    row(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font:700 13px/1 ${FONT};letter-spacing:.22em;text-transform:uppercase;color:${INK}">Sobremesa Dinners</td>
      <td align="right" style="font:500 13px/1 ${FONT};letter-spacing:.22em;text-transform:uppercase;color:${SOFT}">No. ${event.number}</td>
    </tr></table>`) + rule,
    `SOBREMESA DINNERS · No. ${event.number}\n`,
  );

  // ---- greeting
  const heading = fill(copy.heading, ctx);
  const intro = fill(draft.intro, ctx);
  add(
    row(label(copy.eyebrow) + gap(12) +
      `<h1 style="margin:0;font:700 32px/1.15 ${FONT};color:${INK}">${esc(heading)}</h1>` + gap(18) + paras(intro)),
    `${heading}\n\n${intro}\n`,
  );

  // ---- when, where, topic (before the dinner), and the main button under it
  if (!after) {
    const date = when(ctx);
    const showAddress = day && Boolean(event.venue);
    const place = showAddress ? [event.venue, city].filter(Boolean).join(", ") : null;
    const whereText = place ?? [city, L.whereLater].filter(Boolean).join(". ");
    const plain: [string, string][] = [...(date ? [[L.when, date] as [string, string]] : []), [L.where, whereText], [L.topic, topic]];
    const rows = plain.map(([k, v]) => [k, esc(v)] as [string, string]);

    let action = "";
    let actionText = "";
    if (kind === "student_week") {
      const url = `${ctx.site}/confirmar/${ctx.code}`;
      action = button(url, L.confirm) + gap(14) + para(esc(L.confirmNote), SOFT);
      actionText = `${L.confirm}: ${url}\n${L.confirmNote}\n`;
    } else if (showAddress) {
      const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place!)}`;
      action = button(maps, L.openMaps);
      actionText = `${L.openMaps}: ${maps}\n`;
    } else if (kind === "speaker_confirmed") {
      const cal = googleCalendarUrl(event, ctx.lang, ctx.site);
      if (cal) {
        action = button(cal, L.addCalendar);
        actionText = `${L.addCalendar}: ${cal}\n`;
      }
    }
    add(
      row(gap(28) + box(rows) + (action ? gap(24) + action : "")),
      `\n${plain.map(([k, v]) => `${k}: ${v}`).join("\n")}\n${actionText}`,
    );
  }

  // ---- payment (students: always in "you're in", and the day before only if unpaid)
  if (forStudent && pay && (kind === "student_week" || (day && !ctx.paid))) {
    const title = kind === "student_week" ? L.pay : L.unpaid;
    const lead = para(`${esc(L.payLead)} <strong style="font-weight:700">$${pay.price}</strong> ${esc(L.via)} ${pay.method}.`);
    const how = pay.method === "Zelle"
      ? box([["Zelle", `<span style="font:700 26px/1.3 ${FONT};color:${INK}">${esc(pay.to)}</span>`]]) + gap(12) + para(esc(L.payNote(note)), SOFT)
      : para(esc(L.payNote(note)), SOFT) + gap(18) + button(venmoLink(pay.to, pay.price, note), L.payButton, true);
    add(
      rule + row(label(title) + gap(12) + lead + gap(18) + how),
      `\n${title}: ${L.payLead} $${pay.price} ${L.via} ${pay.method}. ${pay.method === "Zelle" ? pay.to : venmoLink(pay.to, pay.price, note)}\n${L.payNote(note)}\n`,
    );
  }

  // ---- who's coming (students, "you're in": the speakers who agreed to be shown)
  const shown = ctx.speakers.filter((s) => s.shown);
  if (kind === "student_week" && shown.length) {
    add(
      rule + row(label(L.whosComing) + gap(18) + people(shown.map((s) => ({
        name: s.name,
        line: esc(s.bio || [s.role, s.company].filter(Boolean).join(", ")) + (s.linkedin_url ? ` ${link(s.linkedin_url, L.viewProfile)}` : ""),
      })))),
      `\n${L.whosComing}:\n${shown.map((s) => `- ${s.name}: ${s.bio || [s.role, s.company].filter(Boolean).join(", ")}${s.linkedin_url ? ` (${s.linkedin_url})` : ""}`).join("\n")}\n`,
    );
  }

  // ---- what's next (students, "you're in")
  if (kind === "student_week") {
    const addressDay = dueAt("student_day", event.starts_at);
    const items = [
      ...(addressDay ? [L.nextAddress(dateFmt(ctx.lang, { weekday: "long", month: "short", day: "numeric" }).format(addressDay))] : []),
      L.nextCancel,
    ];
    add(rule + row(label(L.whatsNext) + gap(16) + numbered(items.map(esc))), `\n${L.whatsNext}:\n${items.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n`);
  }

  // ---- what the students want to hear (speakers, a week before and the day before)
  const speakerBefore = !forStudent && !after && kind !== "speaker_confirmed";
  if (speakerBefore && event.hear_points.length) {
    add(
      rule + row(label(L.hear) + gap(16) + numbered(event.hear_points.map(esc))),
      `\n${L.hear}:\n${event.hear_points.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n`,
    );
  }

  // ---- the other speakers
  if (speakerBefore && ctx.speakers.length) {
    add(
      rule + row(label(L.fellow) + gap(18) + people(ctx.speakers.map((s) => ({
        name: s.name,
        line: esc(s.bio || [s.role, s.company].filter(Boolean).join(", ")) + (s.linkedin_url ? ` ${link(s.linkedin_url, L.viewProfile)}` : ""),
      })))),
      `\n${L.fellow}:\n${ctx.speakers.map((s) => `- ${s.name}: ${s.bio || [s.role, s.company].filter(Boolean).join(", ")}${s.linkedin_url ? ` (${s.linkedin_url})` : ""}`).join("\n")}\n`,
    );
  }

  // ---- the students
  if (speakerBefore && ctx.students.length) {
    add(
      rule + row(label(L.students(ctx.students.length)) + gap(18) + people(ctx.students.map((s) => ({
        name: s.name,
        line: esc(L.year(s.year)) + (s.linkedin_url ? `. ${link(s.linkedin_url, L.profile)}` : ""),
      })))),
      `\n${L.students(ctx.students.length)}:\n${ctx.students.map((s) => `- ${s.name}, ${L.year(s.year)}${s.linkedin_url ? ` (${s.linkedin_url})` : ""}`).join("\n")}\n`,
    );
  }

  // ---- after: photos, feedback, community
  if (after) {
    const page = `${ctx.site}/cena/${event.number}`;
    if (event.photos.length) {
      // Every photo (up to 9): the first large, the rest in pairs, resized by the site so the email loads fast.
      const [lead, ...rest] = event.photos.slice(0, MAX_EMAIL_PHOTOS);
      const img = (src: string, w: number) =>
        `<a href="${esc(page)}"><img src="${esc(emailImage(ctx.site, src, w * 2))}" width="${w}" alt="" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;border-radius:8px"></a>`;
      const pairs: string[][] = [];
      for (let i = 0; i < rest.length; i += 2) pairs.push(rest.slice(i, i + 2));
      add(
        rule + row(label(L.photos) + gap(16) + img(lead, 560) +
          pairs.map((pair) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>${pair.map((p, i) =>
            `<td width="50%" valign="top" style="padding:${i ? "0 0 0 4px" : "0 4px 0 0"}">${img(p, 276)}</td>`).join("")}` +
            (pair.length === 1 ? `<td width="50%"></td>` : "") + `</tr></table>`).join("") +
          gap(16) + para(link(page, L.seeMore))),
        `\n${L.photos}: ${page}\n`,
      );
    }
    const url = `${ctx.site}/feedback/${ctx.code}`;
    add(rule + row(label(L.feedback) + gap(12) + para(esc(L.feedbackIntro)) + gap(20) + button(url, L.feedbackButton)),
      `\n${L.feedback}: ${L.feedbackIntro}\n${url}\n`);
    const wa = whatsappLink(event);
    if (wa) {
      add(rule + row(label(L.whatsapp) + gap(12) + para(esc(L.whatsappIntro)) + gap(20) + button(wa, L.whatsappButton, true)),
        `\n${L.whatsapp}: ${L.whatsappIntro}\n${wa}\n`);
    }
  }

  // ---- sign-off and footer
  const sign = after ? L.signAfter : L.signBefore;
  const why = forStudent ? L.whyStudent(event.number) : L.whySpeaker(event.number);
  add(
    rule + row(para(esc(L.questions), SOFT) + gap(24) +
      para(`${esc(sign)}<br><strong style="font-weight:700;color:${INK}">${esc(L.signers)}</strong><br><span style="color:${SOFT}">Sobremesa Dinners</span>`)) +
      row(gap(40) + `<p style="margin:0;text-align:center;font:400 13px/1.5 ${FONT};color:${SOFT}">${esc(why)}<br>${link(ctx.site, ctx.site.replace(/^https?:\/\/(www\.)?/, ""))}</p>`),
    `\n${L.questions}\n\n${sign}\n${L.signers}\nSobremesa Dinners\n\n${why}\n${ctx.site}`,
  );

  const subject = fill(draft.subject, ctx);
  return {
    subject,
    text: text.join("\n"),
    html: `<!doctype html><html lang="${ctx.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(subject)}</title></head>` +
      `<body style="margin:0;padding:0;background:${WHITE};-webkit-text-size-adjust:100%"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${WHITE}"><tr><td align="center" style="padding:36px 20px 40px">` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">${html.join("")}</table>` +
      `</td></tr></table></body></html>`,
  };
}
