import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequestScopedClient } from "../lib/supabaseClient";
import { UnauthorizedError } from "../utils/AppError";

type ClientFactory = (accessToken: string) => SupabaseClient;

/** The identity extracted from a verified access token (routes only ever need the id). */
export interface AuthUser {
  id: string;
  email?: string;
}

export interface AuthContext {
  user: AuthUser;
  supabase: SupabaseClient;
}

/**
 * Verifies the bearer token and returns the authenticated user plus a request-scoped
 * Supabase client (RLS-enforced).
 *
 * Uses getClaims(): with asymmetric signing keys the JWT signature and expiry are checked
 * locally (public keys are cached), saving a network round trip to Supabase Auth on every API
 * call; with legacy symmetric keys it transparently falls back to asking the Auth server.
 * clientFactory is injectable so tests can supply a mocked Supabase client.
 */
export async function authenticate(
  request: Request,
  clientFactory: ClientFactory = createRequestScopedClient,
): Promise<AuthContext> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    throw new UnauthorizedError("Falta el token de autenticación");
  }

  const client = clientFactory(token);
  const { data, error } = await client.auth.getClaims(token);
  const claims = data?.claims;

  if (error || !claims?.sub) {
    throw new UnauthorizedError("Token inválido o expirado");
  }

  return { user: { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined }, supabase: client };
}
