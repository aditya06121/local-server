import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import dbConnect, { closeDb } from "../../src/db.js";
import {
  deleteUsersByEmails,
  findUserWithSessionsByEmail,
} from "../../src/db/queries.js";
import { compareRefreshToken } from "../../src/utils/auth.token.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

const createdEmails = new Set<string>();

function buildRegisterPayload() {
  const email = `refresh-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;
  createdEmails.add(email);

  return {
    name: "aditya",
    email,
    password: "123456",
  };
}

function getCookie(
  cookies: Array<{
    name: string;
    value?: string;
    httpOnly?: boolean;
    path?: string;
    maxAge?: number;
  }>,
  name: string,
) {
  return cookies.find((cookie) => cookie.name === name);
}

async function cleanupUsers() {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

  await deleteUsersByEmails(emails);
}

describe("POST /auth/refresh-token", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  beforeEach(async () => {
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await cleanupUsers();
    await closeDb();
  });

  it("should return 200, rotate the refresh session, and set auth cookies", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const oldRefreshTokenCookie = getCookie(registerRes.cookies, "refreshToken");
    const oldRefreshToken = oldRefreshTokenCookie?.value;

    expect(oldRefreshToken).toEqual(expect.any(String));

    const userBeforeRefresh = await findUserWithSessionsByEmail(payload.email);

    expect(userBeforeRefresh?.sessions).toHaveLength(1);

    const refreshRes = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: {
        cookie: `refreshToken=${oldRefreshToken}`,
      },
    });

    const body = refreshRes.json();
    const accessTokenCookie = getCookie(refreshRes.cookies, "accessToken");
    const refreshTokenCookie = getCookie(refreshRes.cookies, "refreshToken");
    const newRefreshToken = refreshTokenCookie?.value;

    expect(refreshRes.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "TOKEN_REFRESHED",
      data: {},
    });
    expect((body.data as Record<string, unknown>).accessToken).toBeUndefined();
    expect((body.data as Record<string, unknown>).refreshToken).toBeUndefined();
    expect(refreshRes.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "accessToken",
          httpOnly: true,
          path: "/",
          maxAge: 15 * 60,
        }),
        expect.objectContaining({
          name: "refreshToken",
          httpOnly: true,
          path: "/",
          maxAge: 7 * 24 * 60 * 60,
        }),
      ]),
    );

    expect(accessTokenCookie?.value).toEqual(expect.any(String));
    expect(newRefreshToken).toEqual(expect.any(String));
    expect(newRefreshToken).not.toBe(oldRefreshToken);

    const userAfterRefresh = await findUserWithSessionsByEmail(payload.email);

    expect(userAfterRefresh?.sessions).toHaveLength(1);
    expect(
      await compareRefreshToken(
        newRefreshToken!,
        userAfterRefresh!.sessions[0]!.refreshToken,
      ),
    ).toBe(true);
    expect(
      await compareRefreshToken(
        oldRefreshToken!,
        userAfterRefresh!.sessions[0]!.refreshToken,
      ),
    ).toBe(false);

    const secondRefreshWithOldToken = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      headers: {
        cookie: `refreshToken=${oldRefreshToken}`,
      },
    });

    expect(secondRefreshWithOldToken.statusCode).toBe(401);
    expect(secondRefreshWithOldToken.cookies).toHaveLength(0);
    expect(secondRefreshWithOldToken.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_TOKEN",
      },
    });
  });

  it("should return 401 when refresh token cookie is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
    });

    expect(res.statusCode).toBe(401);
    expect(res.cookies).toHaveLength(0);
    expect(res.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("should return 401 when refresh token is invalid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      cookies: {
        refreshToken: "invalid-token",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.cookies).toHaveLength(0);
    expect(res.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_TOKEN",
      },
    });
  });
});
