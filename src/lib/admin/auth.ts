import "server-only";
import { sessionClient } from "@/lib/supabase/session";

/** For admin route handlers: the signed-in admin's client (RLS applies), or a 401/403 response. */
export async function requireAdmin() {
  const db = await sessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) } as const;
  const { data: isAdmin } = await db.rpc("is_admin");
  if (!isAdmin) return { error: Response.json({ error: "forbidden" }, { status: 403 }) } as const;
  return { db, email: user.email ?? "" } as const;
}
