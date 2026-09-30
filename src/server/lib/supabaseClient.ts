import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../config/env";

/**
 * Builds a Supabase client scoped to a single request's JWT. Every query
 * made through this client is subject to Row Level Security as that user —
 * this is how the backend avoids ever trusting a client-supplied user_id.
 * Requires isSupabaseConfigured to be true; callers must check that via the
 * serviceAvailability middleware before reaching here.
 */
export function createRequestScopedClient(accessToken: string): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }
  return createClient(env.SUPABASE_URL as string, env.SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
