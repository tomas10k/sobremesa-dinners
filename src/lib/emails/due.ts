import type { EventRow } from "@/lib/admin/types";
import { recipientsFor, type EmailData } from "./recipients";
import { EMAIL_KINDS, PAY_WITHIN_MS, emailState, type EmailKind, type EmailState } from "./schedule";

export type EmailStatus = { kind: EmailKind; state: EmailState; eligible: number; sent: number; noEmail: number };

/** Where each of a dinner's emails stands right now. */
export function eventEmailStatus(event: EventRow, data: EmailData, now = new Date()): EmailStatus[] {
  return EMAIL_KINDS.map((kind) => {
    const all = recipientsFor(kind, event, data);
    const reachable = all.filter((r) => r.email);
    const sent = reachable.filter((r) => r.sentAt).length;
    return {
      kind,
      state: emailState(kind, event.starts_at, reachable.length, sent, now),
      eligible: reachable.length,
      sent,
      noEmail: all.length - reachable.length,
    };
  });
}

/** Accepted students who got "you're in" over 48 hours ago and still haven't paid. */
export function unpaidStudents(event: EventRow, data: EmailData, now = new Date()) {
  if (event.starts_at && Date.parse(event.starts_at) < now.getTime() - 14 * 24 * 60 * 60 * 1000) return [];
  return recipientsFor("student_week", event, data).filter(
    (r) => !r.paid && r.sentAt && now.getTime() - Date.parse(r.sentAt) > PAY_WITHIN_MS,
  );
}

export type DueItem = { event: EventRow; kind: EmailKind; pending: number; needsPhotos: boolean };

/** Everything to act on today, across dinners: for the morning reminder and the admin badge. */
export function dueToday(data: EmailData, now = new Date()) {
  const live = data.events.filter((e) => e.status !== "draft");
  const emails: DueItem[] = live.flatMap((event) =>
    eventEmailStatus(event, data, now)
      .filter((s) => s.state === "due")
      .map((s) => ({
        event, kind: s.kind, pending: s.eligible - s.sent,
        needsPhotos: s.kind.endsWith("_after") && event.photos.length === 0,
      })),
  );
  const unpaid = live.flatMap((event) => unpaidStudents(event, data, now).map((student) => ({ event, student })));
  return { emails, unpaid };
}
