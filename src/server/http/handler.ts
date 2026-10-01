import { NextResponse } from "next/server";
import type { ZodType, ZodTypeDef } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { authenticate, type AuthUser } from "./requireAuth";
import { assertServices, type ServiceName } from "./serviceAvailability";

interface HandlerContext<TBody, TParams> {
  request: Request;
  user: AuthUser;
  supabase: SupabaseClient;
  body: TBody;
  params: TParams;
}

interface HandlerOptions<TBody> {
  /** Backing services that must be configured, checked before auth (same order as the old Express routes). */
  services: ServiceName[];
  /** Zod schema for the JSON body; when set, the parsed body is passed to the handler. */
  schema?: ZodType<TBody, ZodTypeDef, unknown>;
  /** Success status code (default 200). */
  status?: number;
}

type RouteContext<TParams> = { params: Promise<TParams> };

function errorResponse(error: unknown, path: string): NextResponse {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, path, code: error.code }, "Unhandled application error");
    }
    return NextResponse.json(
      { message: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) },
      { status: error.statusCode },
    );
  }

  logger.error({ err: error, path }, "Unexpected error");
  return NextResponse.json(
    { message: "Ocurrió un error inesperado en el servidor", code: "internal_error" },
    { status: 500 },
  );
}

/**
 * Wraps an authenticated API route: service availability → auth (RLS-scoped
 * Supabase client) → body validation → handler, with AppError → JSON mapping.
 * Replaces the Express serviceAvailability/requireAuth/validateRequest/errorHandler chain.
 */
export function authedRoute<TBody = undefined, TParams = Record<string, never>>(
  options: HandlerOptions<TBody>,
  handler: (ctx: HandlerContext<TBody, TParams>) => Promise<unknown>,
) {
  return async (request: Request, routeContext: RouteContext<TParams>): Promise<NextResponse> => {
    const path = new URL(request.url).pathname;
    try {
      assertServices(...options.services);
      const { user, supabase } = await authenticate(request);

      let body = undefined as TBody;
      if (options.schema) {
        const raw = await request.json().catch(() => undefined);
        const result = options.schema.safeParse(raw);
        if (!result.success) {
          throw new AppError("Datos de solicitud inválidos", 400, "invalid_request", result.error.flatten());
        }
        body = result.data;
      }

      const params = (await routeContext.params) as TParams;
      const result = await handler({ request, user, supabase, body, params });
      return NextResponse.json(result, { status: options.status ?? 200 });
    } catch (error) {
      return errorResponse(error, path);
    }
  };
}
