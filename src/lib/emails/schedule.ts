import { isoToPacificInput, pacificInputToISO } from "@/lib/tz";

/** Every email in a dinner's life, in the order they go out. */
export const EMAIL_KINDS = [
  "speaker_confirmed", "speaker_week", "student_week",
  "speaker_day", "student_day", "speaker_after", "student_after",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const audienceOf = (kind: EmailKind) => (kind.startsWith("speaker") ? "speakers" : "students");

export const KIND_LABEL: Record<EmailKind, string> = {
  speaker_confirmed: "Speakers · Confirmación",
  speaker_week: "Speakers · La mesa está puesta (7 días antes)",
  speaker_day: "Speakers · Recordatorio con dirección (24 h antes)",
  speaker_after: "Speakers · Gracias + feedback (día después)",
  student_week: "Estudiantes · Tienes lugar + Venmo (7 días antes)",
  student_day: "Estudiantes · Recordatorio con dirección (día antes, 10 am)",
  student_after: "Estudiantes · Gracias + feedback (día después)",
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Unpaid students get flagged this long after their "you're in" email. */
export const PAY_WITHIN_MS = 48 * HOUR;

/** The dinner's Pacific calendar date plus `days`, at `hour`:00 Pacific. */
function pacificDayAt(startsAt: string, days: number, hour: number): Date {
  const [y, m, d] = isoToPacificInput(startsAt).slice(0, 10).split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
  return new Date(pacificInputToISO(`${day}T${String(hour).padStart(2, "0")}:00`)!);
}

/** When an email should go out, or null if it goes out on confirmation (or there's no date yet). */
export function dueAt(kind: EmailKind, startsAt: string | null): Date | null {
  if (!startsAt || kind === "speaker_confirmed") return null;
  switch (kind) {
    case "speaker_week":
    case "student_week": return pacificDayAt(startsAt, -7, 9);
    case "speaker_day": return new Date(Date.parse(startsAt) - DAY);
    case "student_day": return pacificDayAt(startsAt, -1, 10);
    case "speaker_after":
    case "student_after": return pacificDayAt(startsAt, 1, 8);
  }
}

export type EmailState =
  | "none"     // nobody to send it to (yet)
  | "waiting"  // not due yet
  | "due"      // due now and someone hasn't received it
  | "done"     // everyone eligible has it
  | "missed";  // the moment passed (e.g. a reminder after the dinner); not flagged anymore

/** Where an email stands for one dinner, given how many people should get it and how many did. */
export function emailState(
  kind: EmailKind, startsAt: string | null, eligible: number, sent: number, now = new Date(),
): EmailState {
  if (eligible === 0) return "none";
  if (sent >= eligible) return "done";
  if (kind === "speaker_confirmed") {
    return startsAt && now.getTime() > Date.parse(startsAt) ? "missed" : "due";
  }
  const due = dueAt(kind, startsAt);
  if (!due) return "waiting";
  if (now < due) return "waiting";
  // Before-the-dinner emails stop mattering once it starts; thank-yous after two weeks.
  const deadline = kind.endsWith("_after") ? due.getTime() + 14 * DAY : Date.parse(startsAt!);
  return now.getTime() > deadline ? "missed" : "due";
}
