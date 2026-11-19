export type EventRow = {
  id: string;
  created_at: string;
  number: number;
  title_es: string;
  title_en: string;
  description_es: string | null;
  description_en: string | null;
  starts_at: string | null;
  city: "berkeley" | "sf" | null;
  venue: string | null;
  sponsor: string | null;
  status: "draft" | "upcoming" | "past";
  applications_open: boolean;
  speakers_needed: number;
  photos: string[];
  quotes: { text: string; author: string }[];
  /** For the guest emails. */
  price_usd: number | null;
  venmo_handle: string | null;
  hear_points: string[];
  /** Invite to the WhatsApp community in the thank-yous, once all the speakers agreed. */
  whatsapp_on: boolean;
  whatsapp_url: string | null;
  notes: string | null;
};

export type EventSpeaker = {
  event_id: string;
  speaker_id: string;
  created_at: string;
  status: "interested" | "maybe" | "invited" | "confirmed" | "declined";
  source: "form" | "admin";
  /** Behind their personal feedback link. */
  code: string;
};

export type SpeakerRow = {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  company: string;
  role: string;
  industry: string;
  weekdays: string[];
  available_weeks: string[];
  cities: string[];
  motivations: string[];
  motivation_other: string | null;
  can_host: boolean;
  can_sponsor: boolean;
  hiring: boolean;
  dietary: string | null;
  roots: string | null;
  heard_from: string | null;
  lang: string;
  status: "new" | "contacted" | "confirmed" | "declined";
  /** Agreed to show their name and photo on the public site. */
  public_profile: boolean;
  photo_url: string | null;
  /** One or two lines, shown to the other speakers in the emails. */
  bio: string | null;
  notes: string | null;
};

export type StudentRow = {
  id: string;
  created_at: string;
  event_id: string;
  name: string;
  email: string;
  linkedin_url: string | null;
  university: string;
  program: string;
  year: "1" | "2";
  essay: string;
  lang: string;
  status: "applied" | "accepted" | "waitlist" | "rejected" | "confirmed" | "attended";
  /** Behind their confirm-your-seat and feedback links. */
  code: string;
  dietary: string | null;
  seat_confirmed_at: string | null;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
};

export type ProposalRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  kind: "speakers" | "topics" | "both";
  status: "new" | "reviewed" | "used" | "skipped";
  notes: string | null;
};

export type ProposalSpeakerRow = {
  id: string;
  proposal_id: string;
  name: string;
  company: string | null;
  role: string | null;
  linkedin_url: string | null;
  reason: string | null;
};

export type ProposalTopicRow = {
  id: string;
  proposal_id: string;
  title: string;
  description: string | null;
};

export type ReferralRow = {
  id: string;
  created_at: string;
  referred_by: string | null;
  name: string;
  linkedin_url: string | null;
  email: string | null;
  reason: string | null;
  status: "new" | "contacted" | "converted" | "skipped";
  notes: string | null;
};

/** A personal invite: up to three proposed dates, answered at /invitacion/<code>. */
export type InviteRow = {
  id: string;
  created_at: string;
  code: string;
  speaker_id: string;
  event_id: string | null;
  dates: string[];
  response: "pending" | "accepted" | "declined";
  chosen_date: string | null;
  message: string | null;
  responded_at: string | null;
};

export type EmailLogRow = {
  id: string;
  sent_at: string;
  event_id: string;
  kind: string;
  speaker_id: string | null;
  student_id: string | null;
  email: string;
  sent_by: string;
  provider_id: string | null;
};

export type EmailDraftRow = {
  event_id: string;
  kind: string;
  lang: "es" | "en";
  subject: string;
  intro: string;
  updated_at: string;
};

export type FeedbackRow = {
  id: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  speaker_id: string | null;
  student_id: string | null;
  overall: number;
  food: number | null;
  come_back: "yes" | "maybe" | "no" | null;
  more_of: string | null;
  less_of: string | null;
  improve: string | null;
  refer: string | null;
  highlight: string | null;
  quote_ok: boolean;
};

export type AdminData = {
  events: EventRow[];
  eventSpeakers: EventSpeaker[];
  speakers: SpeakerRow[];
  students: StudentRow[];
  proposals: ProposalRow[];
  proposalSpeakers: ProposalSpeakerRow[];
  proposalTopics: ProposalTopicRow[];
  referrals: ReferralRow[];
  invites: InviteRow[];
  emailLog: EmailLogRow[];
  emailDrafts: EmailDraftRow[];
  feedback: FeedbackRow[];
};

export type TableName =
  | "events" | "speakers" | "students" | "proposals"
  | "proposal_speakers" | "proposal_topics" | "referrals" | "invites" | "feedback";
