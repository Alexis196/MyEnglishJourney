import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticate } from "./requireAuth";
import { UnauthorizedError } from "../utils/AppError";

function makeRequest(authorization?: string): Request {
  return new Request("http://localhost/api/test", {
    headers: authorization ? { authorization } : {},
  });
}

function makeMockClient(getUserImpl: () => Promise<{ data: { user: unknown }; error: unknown }>): SupabaseClient {
  return { auth: { getUser: getUserImpl } } as unknown as SupabaseClient;
}

describe("authenticate", () => {
  it("rejects requests with no Authorization header", async () => {
    const factory = () => makeMockClient(async () => ({ data: { user: null }, error: null }));
    await expect(authenticate(makeRequest(undefined), factory)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rejects an invalid or expired token", async () => {
    const clientFactory = vi.fn(() =>
      makeMockClient(async () => ({ data: { user: null }, error: { message: "invalid token" } })),
    );

    await expect(authenticate(makeRequest("Bearer bad-token"), clientFactory)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(clientFactory).toHaveBeenCalledWith("bad-token");
  });

  it("returns the user and supabase client for a valid token", async () => {
    const fakeUser = { id: "user-123", email: "test@example.com" };
    const fakeClient = makeMockClient(async () => ({ data: { user: fakeUser }, error: null }));

    const result = await authenticate(makeRequest("Bearer good-token"), () => fakeClient);

    expect(result.user).toEqual(fakeUser);
    expect(result.supabase).toBe(fakeClient);
  });

  it("propagates unexpected errors", async () => {
    const boom = new Error("network down");
    await expect(
      authenticate(makeRequest("Bearer good-token"), () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
  });
});
