import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodError } from "zod";

export function invalid(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    fields[path] ??= issue.message === "too_long" ? "too_long" : issue.code;
  }
  return Response.json({ error: "invalid", fields }, { status: 400 });
}

export const notConfigured = () =>
  Response.json({ error: "not_configured" }, { status: 503 });

export const serverError = (where: string, message: string) => {
  console.error(where, message);
  return Response.json({ error: "server" }, { status: 500 });
};

export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/** Per form: how many submissions one visitor can send per window. */
const LIMITS = {
  speakers: { max: 5, windowSeconds: 600 },
  students: { max: 5, windowSeconds: 600 },
  proposals: { max: 5, windowSeconds: 600 },
  invites: { max: 20, windowSeconds: 600 },
  confirm: { max: 20, windowSeconds: 600 },
  feedback: { max: 20, windowSeconds: 600 },
} as const;

/**
 * Returns a 429 response when this visitor has sent too many submissions to `form`
 * lately, or null to go ahead. Visitors are told apart by a hash of their IP, never
 * the IP itself. If the check itself fails, the submission goes through.
 */
export async function rateLimited(req: Request, db: SupabaseClient, form: keyof typeof LIMITS): Promise<Response | null> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const hash = createHash("sha256").update(`${process.env.CRON_SECRET ?? ""}:${ip}`).digest("hex").slice(0, 32);
  const { max, windowSeconds } = LIMITS[form];
  const { data: allowed, error } = await db.rpc("rate_limit_hit", { p_key: `${form}:${hash}`, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("rate_limit_hit", error.message);
    return null;
  }
  return allowed ? null : Response.json({ error: "rate_limited" }, { status: 429 });
}
