import { publicClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** For uptime checks: is the app up, and can it reach the database? */
export async function GET() {
  const db = publicClient();
  if (!db || !supabaseConfigured) return Response.json({ ok: false, db: "not_configured" }, { status: 503 });
  const { error } = await db.from("events").select("id").limit(1);
  return Response.json({ ok: !error, db: error ? "error" : "ok" }, { status: error ? 503 : 200 });
}
