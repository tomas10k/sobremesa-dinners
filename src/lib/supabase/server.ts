import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

export const supabaseConfigured = Boolean(url && publishableKey && secretKey);

const options = { auth: { persistSession: false, autoRefreshToken: false } };

/** Public reads. Runs as the `anon` role, so RLS limits it to published events. */
export function publicClient(): SupabaseClient | null {
  return url && publishableKey ? createClient(url, publishableKey, options) : null;
}

/**
 * Inserts from the public forms, after the route handler has validated the input.
 * The secret key bypasses RLS, so it must never reach the browser.
 */
export function serviceClient(): SupabaseClient | null {
  return url && secretKey ? createClient(url, secretKey, options) : null;
}
