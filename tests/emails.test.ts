import { describe, expect, it } from "vitest";
import type { EventRow, EventSpeaker, SpeakerRow, StudentRow } from "@/lib/admin/types";
import { dueToday, unpaidStudents } from "@/lib/emails/due";
import { emailContext, recipientsFor, type EmailData } from "@/lib/emails/recipients";
import { defaultDraft, renderEmail } from "@/lib/emails/render";
import { dueAt, emailState } from "@/lib/emails/schedule";

const SITE = "https://sobremesadinners.com";
// No. 1: Tuesday Nov 17, 2026, 7pm in Berkeley (Pacific standard time).
const STARTS = "2026-11-18T03:00:00.000Z";

const event = {
  id: "e1", number: 1, title_es: "Emprender siendo latino", title_en: "Entrepreneurship as a Latino",
  starts_at: STARTS, city: "berkeley", venue: "100 Example Street", status: "upcoming",
  photos: [], quotes: [], price_usd: 18, venmo_handle: "tomas-diez", hear_points: ["How you made the leap"],
} as unknown as EventRow;

const speaker = (id: string, extra: Partial<SpeakerRow> = {}) =>
  ({ id, name: `Speaker ${id}`, email: `${id}@x.com`, role: "CEO", company: `Co ${id}`, bio: null, linkedin_url: null, lang: "en", ...extra }) as SpeakerRow;
const link = (speaker_id: string, status: EventSpeaker["status"] = "confirmed") =>
  ({ event_id: "e1", speaker_id, status, code: `code-${speaker_id}` }) as EventSpeaker;
const student = (id: string, extra: Partial<StudentRow> = {}) =>
  ({
    id, event_id: "e1", name: `Student ${id}`, email: `${id}@berkeley.edu`, year: "1", status: "accepted",
    lang: "es", code: `scode${id}`, paid: false, linkedin_url: `https://linkedin.com/in/${id}`, ...extra,
  }) as StudentRow;

const data = (over: Partial<EmailData> = {}): EmailData => ({
  events: [event],
  speakers: [speaker("a"), speaker("b"), speaker("c", { email: null })],
  eventSpeakers: [link("a"), link("b"), link("c"), link("d", "invited")],
  students: [student("s1"), student("s2", { linkedin_url: null, paid: true }), student("s3", { status: "waitlist" })],
  emailLog: [],
  ...over,
});

describe("dueAt", () => {
  it("puts each email at its moment, in Pacific time", () => {
    expect(dueAt("speaker_week", STARTS)?.toISOString()).toBe("2026-11-10T17:00:00.000Z"); // Nov 10, 9am
    expect(dueAt("student_week", STARTS)?.toISOString()).toBe("2026-11-10T17:00:00.000Z");
    expect(dueAt("speaker_day", STARTS)?.toISOString()).toBe("2026-11-17T03:00:00.000Z"); // 24 h before
    expect(dueAt("student_day", STARTS)?.toISOString()).toBe("2026-11-16T18:00:00.000Z"); // Nov 16, 10am
    expect(dueAt("student_after", STARTS)?.toISOString()).toBe("2026-11-18T16:00:00.000Z"); // Nov 18, 8am
  });
  it("keeps 9am a week before when daylight saving changes in between", () => {
    // Nov 3, 2026, 7pm PST; a week earlier is still daylight time (UTC-7).
    expect(dueAt("speaker_week", "2026-11-04T03:00:00.000Z")?.toISOString()).toBe("2026-10-27T16:00:00.000Z");
  });
  it("has no date for the confirmation, or for dinners without a date", () => {
    expect(dueAt("speaker_confirmed", STARTS)).toBeNull();
    expect(dueAt("speaker_week", null)).toBeNull();
  });
});

describe("emailState", () => {
  const at = (iso: string) => new Date(iso);
  it("waits, then is due, then done", () => {
    expect(emailState("speaker_week", STARTS, 3, 0, at("2026-11-09T12:00:00Z"))).toBe("waiting");
    expect(emailState("speaker_week", STARTS, 3, 1, at("2026-11-10T18:00:00Z"))).toBe("due");
    expect(emailState("speaker_week", STARTS, 3, 3, at("2026-11-10T18:00:00Z"))).toBe("done");
  });
  it("stops flagging reminders once the dinner started, and thank-yous after two weeks", () => {
    expect(emailState("student_day", STARTS, 2, 0, at("2026-11-18T05:00:00Z"))).toBe("missed");
    expect(emailState("student_after", STARTS, 2, 0, at("2026-11-20T12:00:00Z"))).toBe("due");
    expect(emailState("student_after", STARTS, 2, 0, at("2026-12-10T12:00:00Z"))).toBe("missed");
    expect(emailState("speaker_confirmed", STARTS, 1, 0, at("2026-11-19T12:00:00Z"))).toBe("missed");
  });
  it("has nothing to do without recipients", () => {
    expect(emailState("speaker_week", STARTS, 0, 0)).toBe("none");
  });
});

describe("recipientsFor", () => {
  it("emails confirmed speakers only, and lists those without an email", () => {
    const r = recipientsFor("speaker_week", event, data());
    expect(r.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(r.find((x) => x.id === "c")?.email).toBeNull();
  });
  it("emails accepted students, not the waitlist", () => {
    expect(recipientsFor("student_week", event, data()).map((x) => x.id)).toEqual(["s1", "s2"]);
  });
  it("knows who already got it", () => {
    const d = data({ emailLog: [{ event_id: "e1", kind: "student_week", student_id: "s1", sent_at: "2026-11-10T18:00:00Z" }] as EmailData["emailLog"] });
    expect(recipientsFor("student_week", event, d).find((x) => x.id === "s1")?.sentAt).toBe("2026-11-10T18:00:00Z");
    expect(recipientsFor("student_day", event, d).find((x) => x.id === "s1")?.sentAt).toBeNull();
  });
});

describe("emailContext", () => {
  it("leaves the recipient out of their fellow speakers", () => {
    const d = data();
    const ctx = emailContext("speaker_week", event, recipientsFor("speaker_week", event, d)[0], d, SITE);
    expect(ctx.speakers.map((s) => s.name)).toEqual(["Speaker b", "Speaker c"]);
  });
  it("lists accepted students with their LinkedIn, not the waitlist", () => {
    const d = data();
    const ctx = emailContext("speaker_week", event, recipientsFor("speaker_week", event, d)[0], d, SITE);
    expect(ctx.students.find((s) => s.name === "Student s1")?.linkedin_url).toContain("linkedin.com");
    expect(ctx.students.find((s) => s.name === "Student s2")?.linkedin_url).toBeNull();
    expect(ctx.students.some((s) => s.name === "Student s3")).toBe(false);
  });
});

describe("renderEmail", () => {
  const render = (kind: Parameters<typeof recipientsFor>[0], who: string, d = data()) => {
    const r = recipientsFor(kind, event, d).find((x) => x.id === who)!;
    const ctx = emailContext(kind, event, r, d, SITE);
    return renderEmail(ctx, defaultDraft(ctx));
  };

  it("fills the name and number, in the recipient's language", () => {
    const es = render("student_week", "s1");
    expect(es.subject).toBe("Tienes lugar en Sobremesa No. 1");
    expect(es.html).toContain("Tienes lugar, Student.");
    expect(render("speaker_week", "a").subject).toBe("The table is set: Sobremesa No. 1");
  });
  it("asks for payment and confirmation in “you're in”", () => {
    const { html, text } = render("student_week", "s1");
    expect(html).toContain("account.venmo.com/payment-link");
    expect(html).toContain("recipients=tomas-diez");
    expect(text).toContain(`${SITE}/confirmar/scodes1`);
  });
  it("nudges for payment the day before only if unpaid", () => {
    expect(render("student_day", "s1").html).toContain("Todavía no vemos tu pago");
    expect(render("student_day", "s2").html).not.toContain("Todavía no vemos tu pago");
  });
  it("sends the address only the day before", () => {
    expect(render("speaker_week", "a").html).not.toContain("100 Example Street");
    expect(render("speaker_day", "a").html).toContain("100 Example Street");
    expect(render("student_day", "s1").html).toContain("100 Example Street");
  });
  it("links the feedback form and photos after the dinner", () => {
    const d = data({ events: [{ ...event, photos: ["https://x.supabase.co/p.jpg"] }] });
    const after = { ...event, photos: ["https://x.supabase.co/p.jpg"] };
    const r = recipientsFor("speaker_after", after, d)[0];
    const { html } = renderEmail(emailContext("speaker_after", after, r, d, SITE), defaultDraft({ kind: "speaker_after", lang: "en" }));
    expect(html).toContain(`${SITE}/feedback/code-a`);
    expect(html).toContain("p.jpg");
  });
  it("invites to the WhatsApp community only when it's switched on", () => {
    const withLink = { ...event, whatsapp_url: "https://chat.whatsapp.com/abc" };
    const html = (e: EventRow) => {
      const d = data({ events: [e] });
      const r = recipientsFor("student_after", e, d)[0];
      return renderEmail(emailContext("student_after", e, r, d, SITE), defaultDraft({ kind: "student_after", lang: "es" })).html;
    };
    expect(html({ ...withLink, whatsapp_on: false } as EventRow)).not.toContain("chat.whatsapp.com");
    expect(html({ ...withLink, whatsapp_on: true } as EventRow)).toContain("chat.whatsapp.com/abc");
  });
  it("doesn't list speakers in student emails", () => {
    expect(render("student_week", "s1").html).not.toContain("Speaker a");
  });
  it("escapes what people typed", () => {
    const d = data({ speakers: [speaker("a", { name: "<b>Ana</b>" }), speaker("b", { bio: "R&D <script>" })] });
    const r = recipientsFor("speaker_week", event, d)[0];
    const { html } = renderEmail(emailContext("speaker_week", event, r, d, SITE), defaultDraft({ kind: "speaker_week", lang: "en" }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("R&amp;D &lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
  });
});

describe("reminders to the admins", () => {
  it("flags students unpaid 48 hours after “you're in”", () => {
    const d = data({ emailLog: [
      { event_id: "e1", kind: "student_week", student_id: "s1", sent_at: "2026-11-10T18:00:00Z" },
      { event_id: "e1", kind: "student_week", student_id: "s2", sent_at: "2026-11-10T18:00:00Z" },
    ] as EmailData["emailLog"] });
    expect(unpaidStudents(event, d, new Date("2026-11-12T12:00:00Z"))).toEqual([]);
    expect(unpaidStudents(event, d, new Date("2026-11-12T19:00:00Z")).map((s) => s.id)).toEqual(["s1"]);
  });
  it("lists what's due today across dinners", () => {
    const { emails } = dueToday(data(), new Date("2026-11-10T18:00:00Z"));
    expect(emails.map((e) => e.kind).sort()).toEqual(["speaker_confirmed", "speaker_week", "student_week"]);
  });
});
