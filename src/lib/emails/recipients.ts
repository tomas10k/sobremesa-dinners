import type { AdminData, EventRow, StudentRow } from "@/lib/admin/types";
import { parseLang, type Lang } from "@/lib/i18n";
import { audienceOf, type EmailKind } from "./schedule";

/** What the emails need from the database; the admin page and the cron both load it. */
export type EmailData = Pick<AdminData, "events" | "speakers" | "students" | "eventSpeakers" | "emailLog">;

const STUDENTS_FOR: Partial<Record<EmailKind, StudentRow["status"][]>> = {
  student_week: ["accepted", "confirmed"],
  student_day: ["accepted", "confirmed"],
  student_after: ["accepted", "confirmed", "attended"],
};

export type Recipient = {
  id: string;
  name: string;
  /** Null for speakers added by hand without one: they're listed but can't be emailed. */
  email: string | null;
  lang: Lang;
  code: string;
  paid: boolean;
  /** When they last got this email for this dinner. */
  sentAt: string | null;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** Who should get this email for this dinner: confirmed speakers, or accepted students. */
export function recipientsFor(kind: EmailKind, event: EventRow, data: EmailData): Recipient[] {
  const sentAt = (by: "speaker_id" | "student_id", id: string) =>
    data.emailLog.find((l) => l.event_id === event.id && l.kind === kind && l[by] === id)?.sent_at ?? null;

  if (audienceOf(kind) === "speakers") {
    return data.eventSpeakers
      .filter((l) => l.event_id === event.id && l.status === "confirmed")
      .flatMap((l) => {
        const s = data.speakers.find((x) => x.id === l.speaker_id);
        return s
          ? [{ id: s.id, name: s.name, email: s.email, lang: parseLang(s.lang), code: l.code, paid: true, sentAt: sentAt("speaker_id", s.id) }]
          : [];
      });
  }
  const statuses = STUDENTS_FOR[kind] ?? [];
  return data.students
    .filter((s) => s.event_id === event.id && statuses.includes(s.status))
    .map((s) => ({
      id: s.id, name: s.name, email: s.email, lang: parseLang(s.lang), code: s.code, paid: s.paid,
      sentAt: sentAt("student_id", s.id),
    }));
}

export type EmailContext = {
  site: string;
  kind: EmailKind;
  lang: Lang;
  firstName: string;
  code: string;
  paid: boolean;
  event: Pick<
    EventRow,
    | "number" | "title_es" | "title_en" | "starts_at" | "city" | "venue" | "hear_points" | "photos"
    | "price_usd" | "venmo_handle" | "zelle" | "whatsapp_on" | "whatsapp_url"
  >;
  /** Confirmed speakers, without the recipient. `shown`: they agreed to appear publicly. */
  speakers: { name: string; role: string; company: string; bio: string | null; linkedin_url: string | null; shown: boolean }[];
  /** Accepted students, with their LinkedIn when they gave one. */
  students: { name: string; year: string; linkedin_url: string | null }[];
};

export function emailContext(
  kind: EmailKind, event: EventRow, recipient: Recipient, data: EmailData, site: string,
): EmailContext {
  const speakers = data.eventSpeakers
    .filter((l) => l.event_id === event.id && l.status === "confirmed" && l.speaker_id !== recipient.id)
    .flatMap((l) => data.speakers.filter((s) => s.id === l.speaker_id))
    .map((s) => ({ name: s.name, role: s.role, company: s.company, bio: s.bio, linkedin_url: s.linkedin_url, shown: s.public_profile }));
  const students = data.students
    .filter((s) => s.event_id === event.id && ["accepted", "confirmed", "attended"].includes(s.status))
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((s) => ({ name: s.name, year: s.year, linkedin_url: s.linkedin_url }));
  return {
    site, kind, lang: recipient.lang, firstName: firstName(recipient.name), code: recipient.code, paid: recipient.paid,
    event, speakers, students,
  };
}
