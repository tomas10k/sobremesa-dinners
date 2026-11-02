import { describe, expect, it } from "vitest";
import { proposalSchema, speakerSchema, studentSchema } from "@/lib/schemas";

const EVENT = "11111111-1111-4111-8111-111111111111";

const speaker = {
  name: "Ana López",
  email: "Ana@Example.com",
  linkedin_url: "linkedin.com/in/analopez",
  company: "Acme",
  role: "VP Product",
  industry: "tech",
  weekdays: ["tue"],
  cities: ["sf"],
  motivation: "give_back",
};

const student = {
  event_id: EVENT,
  name: "Luis Pérez",
  email: "luis@berkeley.edu",
  university: "UC Berkeley Haas",
  program: "Full-time MBA",
  year: "1",
  essay: "Quiero conocer a otros latinos.",
};

describe("speakerSchema", () => {
  it("accepts a complete speaker and normalizes email and LinkedIn", () => {
    const r = speakerSchema.parse(speaker);
    expect(r.email).toBe("ana@example.com");
    expect(r.linkedin_url).toBe("https://linkedin.com/in/analopez");
  });
  it("rejects a non-LinkedIn profile link", () => {
    expect(speakerSchema.safeParse({ ...speaker, linkedin_url: "https://evil.com/in/x" }).success).toBe(false);
  });
  it("requires at least one weekday and one city", () => {
    expect(speakerSchema.safeParse({ ...speaker, weekdays: [] }).success).toBe(false);
    expect(speakerSchema.safeParse({ ...speaker, cities: [] }).success).toBe(false);
  });
  it("rejects days outside Monday to Thursday", () => {
    expect(speakerSchema.safeParse({ ...speaker, weekdays: ["fri"] }).success).toBe(false);
  });
  it("rejects submissions that fill the honeypot", () => {
    expect(speakerSchema.safeParse({ ...speaker, website: "spam" }).success).toBe(false);
  });
  it("does not let the client set admin-only fields", () => {
    const r = speakerSchema.parse({ ...speaker, status: "confirmed", notes: "x" });
    expect(r).not.toHaveProperty("status");
    expect(r).not.toHaveProperty("notes");
  });
});

describe("studentSchema", () => {
  it("accepts an essay of exactly 200 words", () => {
    const essay = Array(200).fill("palabra").join(" ");
    expect(studentSchema.safeParse({ ...student, essay }).success).toBe(true);
  });
  it("rejects an essay over 200 words", () => {
    const essay = Array(201).fill("palabra").join(" ");
    expect(studentSchema.safeParse({ ...student, essay }).success).toBe(false);
  });
  it("only accepts first or second year", () => {
    expect(studentSchema.safeParse({ ...student, year: "3" }).success).toBe(false);
  });
});

describe("proposalSchema", () => {
  const base = { name: "Sofía", email: "sofia@example.com" };
  it("needs at least one speaker when proposing speakers", () => {
    expect(proposalSchema.safeParse({ ...base, kind: "speakers", speakers: [] }).success).toBe(false);
  });
  it("needs both lists when proposing both", () => {
    const one = { ...base, kind: "both", speakers: [{ name: "X" }], topics: [] };
    expect(proposalSchema.safeParse(one).success).toBe(false);
    expect(proposalSchema.safeParse({ ...one, topics: [{ title: "IA" }] }).success).toBe(true);
  });
  it("accepts several topics in one go", () => {
    const r = proposalSchema.parse({ ...base, kind: "topics", topics: [{ title: "IA" }, { title: "VC" }] });
    expect(r.topics).toHaveLength(2);
  });
});
