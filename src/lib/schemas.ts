import { z } from "zod";
import { countWords, ESSAY_MAX_WORDS } from "./words";
import { isValidWeek, MAX_WEEKS_AHEAD } from "./weeks";
import { EMAIL_KINDS } from "./emails/schedule";

export const WEEKDAYS = ["mon", "tue", "wed", "thu"] as const;
export const CITIES = ["berkeley", "sf"] as const;
export const MOTIVATIONS = ["give_back", "same_industry", "latino_network", "other"] as const;
export const INDUSTRIES = [
  "tech", "ai", "fintech", "finance", "banking", "vc_pe", "consulting", "entrepreneurship",
  "health", "biotech", "energy", "real_estate", "consumer", "food_ag", "hospitality",
  "fashion_design", "media", "marketing", "sports", "education", "legal", "manufacturing",
  "mobility", "aerospace", "public_social", "other",
] as const;
export const YEARS = ["1", "2"] as const;
export const PROPOSAL_KINDS = ["speakers", "topics", "both"] as const;
export const SEAT_ANSWERS = ["yes", "maybe"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

const email = z.string().trim().toLowerCase().max(200).pipe(z.email());

/** Accepts "linkedin.com/in/x", "www.linkedin.com/in/x" or a full URL; returns https URL. */
export const linkedin = z
  .string()
  .trim()
  .max(300)
  .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine((v) => {
    try {
      const host = new URL(v).hostname.toLowerCase();
      return host === "linkedin.com" || host.endsWith(".linkedin.com");
    } catch {
      return false;
    }
  }, "linkedin");

const optionalLinkedin = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(linkedin.optional());

// Bots fill every field; people never see this one.
const honeypot = z.string().max(0).optional();

export const speakerSchema = z.object({
  name: text(120),
  email,
  linkedin_url: linkedin,
  company: text(120),
  role: text(120),
  industry: z.enum(INDUSTRIES),
  weekdays: z.array(z.enum(WEEKDAYS)).min(1),
  weeks: z
    .array(z.string().refine((w) => isValidWeek(w, new Date()), "week"))
    .min(1)
    .max(MAX_WEEKS_AHEAD + 1)
    .transform((w) => [...new Set(w)].sort()),
  cities: z.array(z.enum(CITIES)).min(1),
  motivations: z.array(z.enum(MOTIVATIONS)).min(1).transform((m) => [...new Set(m)]),
  motivation_other: optionalText(300),
  seats: z
    .array(z.object({ event_id: z.string().uuid(), answer: z.enum(SEAT_ANSWERS) }))
    .max(20)
    .default([]),
  referrals: z
    .array(z.object({ name: text(120), linkedin_url: optionalLinkedin, reason: optionalText(300) }))
    .max(10)
    .default([]),
  can_host: z.boolean().default(false),
  can_sponsor: z.boolean().default(false),
  hiring: z.boolean().default(false),
  dietary: optionalText(200),
  roots: optionalText(80),
  heard_from: optionalText(200),
  lang: z.enum(["es", "en"]).default("es"),
  website: honeypot,
});

export const studentSchema = z.object({
  event_id: z.string().uuid(),
  name: text(120),
  email,
  linkedin_url: optionalLinkedin,
  university: text(120),
  program: text(120),
  year: z.enum(YEARS),
  essay: z
    .string()
    .trim()
    .min(1)
    .max(3000)
    .refine((v) => countWords(v) <= ESSAY_MAX_WORDS, "too_long"),
  lang: z.enum(["es", "en"]).default("es"),
  website: honeypot,
});

export const proposalSchema = z
  .object({
    name: text(120),
    email,
    kind: z.enum(PROPOSAL_KINDS),
    speakers: z
      .array(
        z.object({
          name: text(120),
          company: optionalText(120),
          role: optionalText(120),
          linkedin_url: optionalLinkedin,
          reason: optionalText(500),
        }),
      )
      .max(20)
      .default([]),
    topics: z
      .array(z.object({ title: text(160), description: optionalText(500) }))
      .max(20)
      .default([]),
    website: honeypot,
  })
  .superRefine((p, ctx) => {
    if (p.kind !== "topics" && p.speakers.length === 0)
      ctx.addIssue({ code: "custom", path: ["speakers"], message: "required" });
    if (p.kind !== "speakers" && p.topics.length === 0)
      ctx.addIssue({ code: "custom", path: ["topics"], message: "required" });
  });

/** A speaker's answer to their invite: one of the proposed dates, or none of them. */
export const inviteAnswerSchema = z.object({
  code: z.string().regex(/^[0-9a-f]{16}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  message: optionalText(1000),
  website: honeypot,
});

const draft = z.object({ subject: text(200), intro: text(2000) });

/** Admin: send one of a dinner's emails to some of its recipients (or a test to yourself). */
export const sendEmailsSchema = z.object({
  event_id: z.string().uuid(),
  kind: z.enum(EMAIL_KINDS),
  recipient_ids: z.array(z.string().uuid()).min(1).max(60),
  drafts: z.object({ es: draft, en: draft }),
  test: z.boolean().default(false),
  /** Tests only: render in this language instead of the guest's. */
  lang: z.enum(["es", "en"]).optional(),
});

/** A student confirming their seat from the "you're in" email. */
export const confirmSeatSchema = z.object({
  code: z.string().regex(/^[0-9a-f]{16}$/),
  dietary: optionalText(200),
  website: honeypot,
});

const rating = z.number().int().min(1).max(5);

/** Feedback after a dinner, from a speaker's or student's personal link. */
export const feedbackSchema = z.object({
  code: z.string().regex(/^[0-9a-f]{16}$/),
  overall: rating,
  food: rating.optional(),
  come_back: z.enum(["yes", "maybe", "no"]).optional(),
  more_of: optionalText(1000),
  less_of: optionalText(1000),
  improve: optionalText(1000),
  refer: optionalText(1000),
  highlight: optionalText(400),
  quote_ok: z.boolean().default(false),
  website: honeypot,
});

export type SpeakerInput = z.input<typeof speakerSchema>;
export type StudentInput = z.input<typeof studentSchema>;
export type ProposalInput = z.input<typeof proposalSchema>;
