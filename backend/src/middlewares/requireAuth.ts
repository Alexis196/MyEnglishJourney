import type { NextFunction, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequestScopedClient } from "../lib/supabaseClient.js";
import { UnauthorizedError } from "../utils/AppError.js";

type ClientFactory = (accessToken: string) => SupabaseClient;

/**
 * Verifies the bearer token against Supabase Auth and attaches both the
 * authenticated user and a request-scoped Supabase client (RLS-enforced)
 * to the request. clientFactory is injectable so tests can supply a mocked
 * Supabase client instead of hitting a real project.
 */
export function requireAuth(clientFactory: ClientFactory = createRequestScopedClient) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

    if (!token) {
      next(new UnauthorizedError("Falta el token de autenticación"));
      return;
    }

    try {
      const client = clientFactory(token);
      const { data, error } = await client.auth.getUser(token);

      if (error || !data.user) {
        next(new UnauthorizedError("Token inválido o expirado"));
        return;
      }

      req.user = data.user;
      req.supabase = client;
      next();
    } catch (error) {
      next(error);
    }
  };
}
