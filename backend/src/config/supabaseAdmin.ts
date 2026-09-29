import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const isConfigured = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Service-role client — bypasses Row Level Security entirely. Reserved for
 * trusted server-side admin tasks only (e.g. future scheduled rollup jobs).
 * Never use this to read or write data on behalf of a specific user; use
 * lib/supabaseClient.ts's per-request client for that so RLS applies.
 */
export const supabaseAdmin: SupabaseClient | null = isConfigured
  ? createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
