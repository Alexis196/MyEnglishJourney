import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createRequestScopedClient } from "../lib/supabaseClient";
import { UnauthorizedError } from "../utils/AppError";

type ClientFactory = (accessToken: string) => SupabaseClient;

export interface AuthContext {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Verifies the bearer token against Supabase Auth and returns both the
 * authenticated user and a request-scoped Supabase client (RLS-enforced).
 * clientFactory is injectable so tests can supply a mocked Supabase client
 * instead of hitting a real project.
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
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) {
    throw new UnauthorizedError("Token inválido o expirado");
  }

  return { user: data.user, supabase: client };
}
