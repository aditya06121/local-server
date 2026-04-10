import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import dbConnect, { closeDb } from "../../src/db.js";
import {
  deleteUsersByEmails,
  findUserWithSessionsByEmail,
} from "../../src/db/user.query.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

const createdEmails = new Set<string>();

function buildRegisterPayload() {
  const email = `logout-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;
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
    expires?: Date | string;
    maxAge?: number;
    path?: string;
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

describe("POST /auth/logout", () => {
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

  it("should return 200, remove the session, and clear auth cookies", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const refreshTokenCookie = getCookie(registerRes.cookies, "refreshToken");
    expect(refreshTokenCookie?.value).toEqual(expect.any(String));

    const userBeforeLogout = await findUserWithSessionsByEmail(payload.email);

    expect(userBeforeLogout?.sessions).toHaveLength(1);

    const logoutRes = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: {
        refreshToken: refreshTokenCookie!.value,
      },
    });

    const body = logoutRes.json();

    expect(logoutRes.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "LOGGED_OUT",
      data: {},
    });

    expect(getCookie(logoutRes.cookies, "accessToken")).toEqual(
      expect.objectContaining({
        name: "accessToken",
        path: "/",
      }),
    );
    expect(getCookie(logoutRes.cookies, "refreshToken")).toEqual(
      expect.objectContaining({
        name: "refreshToken",
        path: "/",
      }),
    );

    const userAfterLogout = await findUserWithSessionsByEmail(payload.email);

    expect(userAfterLogout?.sessions).toHaveLength(0);

    const refreshAfterLogout = await app.inject({
      method: "POST",
      url: "/auth/refresh-token",
      cookies: {
        refreshToken: refreshTokenCookie!.value,
      },
    });

    expect(refreshAfterLogout.statusCode).toBe(401);
    expect(refreshAfterLogout.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_TOKEN",
      },
    });
  });

  it("should return 200 and clear cookies even when refresh token cookie is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      message: "LOGGED_OUT",
      data: {},
    });
    expect(getCookie(res.cookies, "accessToken")).toEqual(
      expect.objectContaining({
        name: "accessToken",
        path: "/",
      }),
    );
    expect(getCookie(res.cookies, "refreshToken")).toEqual(
      expect.objectContaining({
        name: "refreshToken",
        path: "/",
      }),
    );
  });

  it("should return 200 and still clear cookies when refresh token is invalid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: {
        refreshToken: "invalid-token",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      success: true,
      message: "LOGGED_OUT",
      data: {},
    });
    expect(getCookie(res.cookies, "accessToken")).toEqual(
      expect.objectContaining({
        name: "accessToken",
        path: "/",
      }),
    );
    expect(getCookie(res.cookies, "refreshToken")).toEqual(
      expect.objectContaining({
        name: "refreshToken",
        path: "/",
      }),
    );
  });
});
