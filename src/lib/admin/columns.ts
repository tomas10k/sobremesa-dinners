import { dictionaries } from "@/lib/i18n";
import { CITIES, INDUSTRIES, MOTIVATIONS, WEEKDAYS, YEARS, PROPOSAL_KINDS } from "@/lib/schemas";
import { formatPacific } from "@/lib/tz";
import type {
  AdminData, EventRow, FeedbackRow, InviteRow, ProposalRow, ProposalSpeakerRow, ProposalTopicRow, ReferralRow, SpeakerRow, StudentRow,
} from "./types";

const t = dictionaries.es;

export type ColType =
  | "text" | "long" | "url" | "int" | "bool" | "select" | "multi"
  | "datetime" | "weeks" | "timestamp";

export type Option = { value: string; label: string };

export type Col<T> = {
  key: keyof T & string;
  label: string;
  type: ColType;
  options?: Option[];
  readOnly?: boolean;
  /** Show a dropdown filter for this column. */
  filter?: boolean;
  /** Computed, read-only value shown instead of the raw field. */
  get?: (row: T) => string;
  width?: number;
};

const opts = (values: readonly string[], label: (v: string) => string): Option[] =>
  values.map((value) => ({ value, label: label(value) }));

export const SPEAKER_STATUS = opts(["new", "contacted", "confirmed", "declined"], (v) =>
  ({ new: "Nuevo", contacted: "Contactado", confirmed: "Confirmado", declined: "No puede" })[v]!);
export const SEAT_STATUS = opts(["interested", "maybe", "invited", "confirmed", "declined"], (v) =>
  ({ interested: "Le interesa", maybe: "Tal vez", invited: "Invitado", confirmed: "Confirmado", declined: "No puede" })[v]!);
export const STUDENT_STATUS = opts(["applied", "accepted", "waitlist", "rejected", "confirmed", "attended"], (v) =>
  ({ applied: "Aplicó", accepted: "Aceptado", waitlist: "Lista de espera", rejected: "No seleccionado", confirmed: "Confirmó", attended: "Asistió" })[v]!);
export const EVENT_STATUS = opts(["draft", "upcoming", "past"], (v) =>
  ({ draft: "Borrador (oculta)", upcoming: "Próxima", past: "Anterior" })[v]!);
export const CITY_OPTS = opts(CITIES, (v) => t[v as "sf"]);
const PROPOSAL_STATUS = opts(["new", "reviewed", "used", "skipped"], (v) =>
  ({ new: "Nueva", reviewed: "Revisada", used: "Usada", skipped: "Descartada" })[v]!);
const REFERRAL_STATUS = opts(["new", "contacted", "converted", "skipped"], (v) =>
  ({ new: "Nuevo", contacted: "Contactado", converted: "Ya es speaker", skipped: "Descartado" })[v]!);
export const INDUSTRY_OPTS = opts(INDUSTRIES, (v) => t[`ind_${v}` as "ind_tech"]);
const WEEKDAY_OPTS = opts(WEEKDAYS, (v) => t[v as "mon"]);
const MOTIVATION_OPTS = opts(MOTIVATIONS, (v) => t[v as "give_back"]);
const LANG_OPTS = [{ value: "es", label: "Español" }, { value: "en", label: "Inglés" }];
const YEAR_OPTS = opts(YEARS, (v) => (v === "1" ? "1er año" : "2o año"));
const KIND_OPTS = opts(PROPOSAL_KINDS, (v) => t[`kind_${v}` as "kind_both"]);

export const RESPONSE_LABEL: Record<InviteRow["response"], string> = {
  pending: "Sin respuesta",
  accepted: "Aceptó",
  declined: "Ninguna fecha",
};
const RESPONSE_OPTS = opts(Object.keys(RESPONSE_LABEL), (v) => RESPONSE_LABEL[v as InviteRow["response"]]);

export const inviteUrl = (code: string) =>
  `${typeof window === "undefined" ? "" : window.location.origin}/invitacion/${code}`;

/** "mar 9 dic", for plain dates like "2026-12-09". */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(/\./g, "");
}

export const eventLabel = (e: Pick<EventRow, "number" | "title_es">) => `No. ${e.number} — ${e.title_es}`;

export function eventColumns(data: AdminData): Col<EventRow>[] {
  const count = (id: string, statuses: string[], rows: { event_id: string; status: string }[]) =>
    rows.filter((r) => r.event_id === id && statuses.includes(r.status)).length;
  return [
    { key: "number", label: "No.", type: "int", width: 60 },
    { key: "title_es", label: "Tema (ES)", type: "text", width: 220 },
    { key: "title_en", label: "Tema (EN)", type: "text", width: 200 },
    { key: "description_es", label: "Descripción (ES)", type: "long", width: 260 },
    { key: "description_en", label: "Descripción (EN)", type: "long", width: 260 },
    { key: "starts_at", label: "Fecha y hora (PT)", type: "datetime", width: 190 },
    { key: "city", label: "Ciudad", type: "select", options: CITY_OPTS, filter: true },
    { key: "venue", label: "Lugar (privado)", type: "text", width: 180 },
    { key: "sponsor", label: "Sponsor", type: "text" },
    { key: "status", label: "Estado", type: "select", options: EVENT_STATUS, filter: true },
    { key: "applications_open", label: "Aplicaciones abiertas", type: "bool", filter: true },
    { key: "speakers_needed", label: "Speakers necesarios", type: "int" },
    { key: "price_usd", label: "Precio (USD)", type: "int" },
    { key: "venmo_handle", label: "Venmo", type: "text" },
    { key: "zelle", label: "Zelle", type: "text" },
    {
      key: "id", label: "Speakers confirmados", type: "text", readOnly: true,
      get: (e) => `${count(e.id, ["confirmed"], data.eventSpeakers)} / ${e.speakers_needed}`,
    },
    {
      key: "created_at", label: "Estudiantes (aceptados / aplicaron)", type: "text", readOnly: true,
      get: (e) => `${count(e.id, ["accepted", "confirmed", "attended"], data.students)} / ${data.students.filter((s) => s.event_id === e.id).length}`,
    },
    { key: "notes", label: "Notas", type: "long", width: 220 },
  ];
}

export function speakerColumns(data: AdminData): Col<SpeakerRow>[] {
  const byId = new Map(data.events.map((e) => [e.id, e]));
  return [
    { key: "name", label: "Nombre", type: "text", width: 180 },
    { key: "status", label: "Estado", type: "select", options: SPEAKER_STATUS, filter: true },
    {
      key: "id", label: "Cenas", type: "text", readOnly: true, width: 200,
      get: (s) => data.eventSpeakers
        .filter((l) => l.speaker_id === s.id)
        .map((l) => `No. ${byId.get(l.event_id)?.number ?? "?"} (${SEAT_STATUS.find((o) => o.value === l.status)?.label})`)
        .join(", "),
    },
    { key: "email", label: "Email", type: "text", width: 200 },
    { key: "linkedin_url", label: "LinkedIn", type: "url" },
    { key: "company", label: "Empresa", type: "text" },
    { key: "role", label: "Rol", type: "text" },
    { key: "public_profile", label: "Autorizó nombre y foto", type: "bool", filter: true },
    { key: "photo_url", label: "Foto", type: "url" },
    { key: "bio", label: "Bio corta (va en los correos)", type: "long", width: 260 },
    { key: "lang", label: "Idioma de los correos", type: "select", options: LANG_OPTS, filter: true },
    { key: "industry", label: "Industria", type: "select", options: INDUSTRY_OPTS, filter: true, width: 170 },
    { key: "weekdays", label: "Días", type: "multi", options: WEEKDAY_OPTS, filter: true, width: 170 },
    { key: "available_weeks", label: "Semanas", type: "weeks", filter: true, width: 200 },
    { key: "cities", label: "Ciudades", type: "multi", options: CITY_OPTS, filter: true, width: 160 },
    { key: "motivations", label: "Qué busca", type: "multi", options: MOTIVATION_OPTS, filter: true, width: 240 },
    { key: "motivation_other", label: "Otra razón", type: "long" },
    { key: "can_host", label: "Presta espacio", type: "bool", filter: true },
    { key: "can_sponsor", label: "Patrocina", type: "bool", filter: true },
    { key: "hiring", label: "Contrata", type: "bool", filter: true },
    { key: "dietary", label: "Dieta", type: "text" },
    { key: "roots", label: "De dónde es", type: "text" },
    { key: "heard_from", label: "Cómo se enteró", type: "text" },
    { key: "notes", label: "Notas", type: "long", width: 220 },
    { key: "created_at", label: "Recibido", type: "timestamp", readOnly: true },
  ];
}

export function studentColumns(data: AdminData): Col<StudentRow>[] {
  return [
    { key: "name", label: "Nombre", type: "text", width: 180 },
    {
      key: "event_id", label: "Cena", type: "select", filter: true, width: 220,
      options: data.events.map((e) => ({ value: e.id, label: eventLabel(e) })),
    },
    { key: "status", label: "Estado", type: "select", options: STUDENT_STATUS, filter: true },
    { key: "paid", label: "Pagó", type: "bool", filter: true },
    { key: "lang", label: "Idioma de los correos", type: "select", options: LANG_OPTS, filter: true },
    { key: "seat_confirmed_at", label: "Confirmó lugar", type: "timestamp", readOnly: true },
    { key: "dietary", label: "Dieta", type: "text" },
    { key: "email", label: "Email", type: "text", width: 200 },
    { key: "university", label: "Universidad", type: "text", filter: true },
    { key: "program", label: "Programa", type: "text", filter: true },
    { key: "year", label: "Año", type: "select", options: YEAR_OPTS, filter: true },
    { key: "linkedin_url", label: "LinkedIn", type: "url" },
    { key: "essay", label: "Ensayo", type: "long", width: 320 },
    { key: "notes", label: "Notas", type: "long", width: 220 },
    { key: "created_at", label: "Recibido", type: "timestamp", readOnly: true },
  ];
}

export function proposalColumns(): Col<ProposalRow>[] {
  return [
    { key: "name", label: "Quién propone", type: "text", width: 180 },
    { key: "email", label: "Email", type: "text", width: 200 },
    { key: "kind", label: "Propone", type: "select", options: KIND_OPTS, filter: true },
    { key: "status", label: "Estado", type: "select", options: PROPOSAL_STATUS, filter: true },
    { key: "notes", label: "Notas", type: "long", width: 220 },
    { key: "created_at", label: "Recibido", type: "timestamp", readOnly: true },
  ];
}

const proposer = (data: AdminData) => (id: string) => data.proposals.find((p) => p.id === id)?.name ?? "";

export function proposalSpeakerColumns(data: AdminData): Col<ProposalSpeakerRow>[] {
  return [
    { key: "name", label: "Speaker propuesto", type: "text", width: 180 },
    { key: "company", label: "Empresa", type: "text" },
    { key: "role", label: "Rol", type: "text" },
    { key: "linkedin_url", label: "LinkedIn", type: "url" },
    { key: "reason", label: "Por qué", type: "long", width: 260 },
    { key: "proposal_id", label: "Lo propuso", type: "text", readOnly: true, get: (r) => proposer(data)(r.proposal_id) },
  ];
}

export function proposalTopicColumns(data: AdminData): Col<ProposalTopicRow>[] {
  return [
    { key: "title", label: "Tema propuesto", type: "text", width: 240 },
    { key: "description", label: "Descripción", type: "long", width: 320 },
    { key: "proposal_id", label: "Lo propuso", type: "text", readOnly: true, get: (r) => proposer(data)(r.proposal_id) },
  ];
}

export function inviteColumns(data: AdminData): Col<InviteRow>[] {
  return [
    {
      key: "speaker_id", label: "Speaker", type: "text", readOnly: true, width: 180,
      get: (r) => data.speakers.find((s) => s.id === r.speaker_id)?.name ?? "",
    },
    {
      key: "event_id", label: "Cena", type: "select", filter: true, width: 220,
      options: data.events.map((e) => ({ value: e.id, label: eventLabel(e) })),
    },
    { key: "dates", label: "Fechas propuestas", type: "text", readOnly: true, width: 240, get: (r) => r.dates.map(dayLabel).join(" · ") },
    { key: "response", label: "Respuesta", type: "select", options: RESPONSE_OPTS, filter: true },
    { key: "chosen_date", label: "Eligió", type: "text", readOnly: true, get: (r) => (r.chosen_date ? dayLabel(r.chosen_date) : "") },
    { key: "message", label: "Mensaje", type: "long", readOnly: true, width: 260 },
    { key: "code", label: "Link", type: "url", readOnly: true, width: 260, get: (r) => inviteUrl(r.code) },
    { key: "created_at", label: "Creada", type: "timestamp", readOnly: true },
  ];
}

const COME_BACK_OPTS = opts(["yes", "maybe", "no"], (v) => ({ yes: "Sí", maybe: "Tal vez", no: "No" })[v]!);

/** Whose feedback a row is, for the table and for quote attribution. */
export function feedbackAuthor(r: FeedbackRow, data: AdminData): { name: string; credit: string; type: string } {
  if (r.student_id) {
    const s = data.students.find((x) => x.id === r.student_id);
    return { name: s?.name ?? "", credit: s ? `${s.name.split(/\s+/)[0]}, ${s.year === "1" ? "MBA 1er año" : "MBA 2o año"}` : "", type: "Estudiante" };
  }
  const s = data.speakers.find((x) => x.id === r.speaker_id);
  return { name: s?.name ?? "", credit: s ? [s.role, s.company].filter(Boolean).join(", ") : "", type: "Speaker" };
}

export function feedbackColumns(data: AdminData): Col<FeedbackRow>[] {
  return [
    { key: "id", label: "Quién", type: "text", readOnly: true, width: 180, get: (r) => feedbackAuthor(r, data).name },
    { key: "student_id", label: "Tipo", type: "text", readOnly: true, filter: false, get: (r) => feedbackAuthor(r, data).type },
    {
      key: "event_id", label: "Cena", type: "select", readOnly: true, filter: true, width: 200,
      options: data.events.map((e) => ({ value: e.id, label: eventLabel(e) })),
    },
    { key: "overall", label: "General (1–5)", type: "int", readOnly: true, filter: true },
    { key: "food", label: "Comida (1–5)", type: "int", readOnly: true, filter: true },
    { key: "come_back", label: "¿Volvería?", type: "select", options: COME_BACK_OPTS, readOnly: true, filter: true },
    { key: "more_of", label: "Más de…", type: "long", readOnly: true, width: 220 },
    { key: "less_of", label: "Menos de…", type: "long", readOnly: true, width: 220 },
    { key: "improve", label: "Mejorar", type: "long", readOnly: true, width: 220 },
    { key: "refer", label: "A quién invitar", type: "long", readOnly: true, width: 200 },
    { key: "highlight", label: "Momento / frase", type: "long", readOnly: true, width: 240 },
    { key: "quote_ok", label: "Se puede citar", type: "bool", readOnly: true, filter: true },
    { key: "created_at", label: "Recibido", type: "timestamp", readOnly: true },
  ];
}

export function referralColumns(data: AdminData): Col<ReferralRow>[] {
  return [
    { key: "name", label: "Referido", type: "text", width: 180 },
    { key: "status", label: "Estado", type: "select", options: REFERRAL_STATUS, filter: true },
    { key: "linkedin_url", label: "LinkedIn", type: "url" },
    { key: "email", label: "Email", type: "text" },
    { key: "reason", label: "Por qué", type: "long", width: 260 },
    {
      key: "referred_by", label: "Lo recomendó", type: "text", readOnly: true,
      get: (r) => data.speakers.find((s) => s.id === r.referred_by)?.name ?? "",
    },
    { key: "notes", label: "Notas", type: "long", width: 220 },
    { key: "created_at", label: "Recibido", type: "timestamp", readOnly: true },
  ];
}

/** Plain-text value of a cell, used for display, search and Excel. */
export function cellText<T>(col: Col<T>, row: T): string {
  if (col.get) return col.get(row);
  const v = row[col.key] as unknown;
  if (v === null || v === undefined || v === "") return "";
  const label = (x: string) => col.options?.find((o) => o.value === x)?.label ?? x;
  switch (col.type) {
    case "bool": return v ? "Sí" : "No";
    case "select": return label(String(v));
    case "multi": return (v as string[]).map(label).join(", ");
    case "weeks": return (v as string[]).map(weekLabel).join(", ");
    case "datetime": return formatPacific(String(v));
    case "timestamp": return new Date(String(v)).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    default: return String(v);
  }
}

export function weekLabel(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  return `sem. ${new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d)).replace(".", "")}`;
}
