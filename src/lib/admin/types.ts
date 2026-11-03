export type EventRow = {
  id: string;
  created_at: string;
  number: number;
  title_es: string;
  title_en: string;
  starts_at: string | null;
  city: "berkeley" | "sf" | null;
  venue: string | null;
  sponsor: string | null;
  status: "draft" | "upcoming" | "past";
  applications_open: boolean;
  speakers_needed: number;
  notes: string | null;
};

export type EventSpeaker = {
  event_id: string;
  speaker_id: string;
  created_at: string;
  status: "interested" | "maybe" | "invited" | "confirmed" | "declined";
  source: "form" | "admin";
};

export type SpeakerRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  linkedin_url: string;
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

export type AdminData = {
  events: EventRow[];
  eventSpeakers: EventSpeaker[];
  speakers: SpeakerRow[];
  students: StudentRow[];
  proposals: ProposalRow[];
  proposalSpeakers: ProposalSpeakerRow[];
  proposalTopics: ProposalTopicRow[];
  referrals: ReferralRow[];
};

export type TableName =
  | "events" | "speakers" | "students" | "proposals"
  | "proposal_speakers" | "proposal_topics" | "referrals";
