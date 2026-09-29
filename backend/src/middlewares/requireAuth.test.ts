import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAuth } from "./requireAuth.js";
import { UnauthorizedError } from "../utils/AppError.js";

function makeRequest(authorization?: string): Request {
  return { headers: { authorization } } as unknown as Request;
}

function makeMockClient(getUserImpl: () => Promise<{ data: { user: unknown }; error: unknown }>): SupabaseClient {
  return { auth: { getUser: getUserImpl } } as unknown as SupabaseClient;
}

describe("requireAuth", () => {
  it("rejects requests with no Authorization header", async () => {
    const next = vi.fn();
    const middleware = requireAuth(() => makeMockClient(async () => ({ data: { user: null }, error: null })));

    await middleware(makeRequest(undefined), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it("rejects an invalid or expired token", async () => {
    const next = vi.fn();
    const clientFactory = vi.fn(() =>
      makeMockClient(async () => ({ data: { user: null }, error: { message: "invalid token" } })),
    );
    const middleware = requireAuth(clientFactory);

    await middleware(makeRequest("Bearer bad-token"), {} as Response, next);

    expect(clientFactory).toHaveBeenCalledWith("bad-token");
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it("attaches user and supabase client for a valid token", async () => {
    const next = vi.fn();
    const fakeUser = { id: "user-123", email: "test@example.com" };
    const fakeClient = makeMockClient(async () => ({ data: { user: fakeUser }, error: null }));
    const middleware = requireAuth(() => fakeClient);

    const req = makeRequest("Bearer good-token");
    await middleware(req, {} as Response, next);

    expect(req.user).toEqual(fakeUser);
    expect(req.supabase).toBe(fakeClient);
    expect(next).toHaveBeenCalledWith();
  });

  it("forwards unexpected errors to next instead of throwing", async () => {
    const next = vi.fn();
    const boom = new Error("network down");
    const middleware = requireAuth(() => {
      throw boom;
    });

    await middleware(makeRequest("Bearer good-token"), {} as Response, next);

    expect(next).toHaveBeenCalledWith(boom);
  });
});
