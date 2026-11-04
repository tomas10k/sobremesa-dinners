import type { PublicEvent } from "./events";

/** Shared by server pages and client components (events.ts is server-only). */
export const canJoinAsSpeaker = (e: PublicEvent) => e.status === "upcoming" && e.seats_left > 0;
export const canApplyAsStudent = (e: PublicEvent) => e.status === "upcoming" && e.applications_open;

/** "Rol, Empresa" for each confirmed speaker. */
export const speakerLine = (e: PublicEvent) => e.speakers.map((s) => `${s.role}, ${s.company}`);
