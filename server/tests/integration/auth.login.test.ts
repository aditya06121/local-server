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
  const email = `login-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;
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

describe("POST /auth/login", () => {
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

  it("should return 200, create a new session, and set auth cookies", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const existingUser = await findUserWithSessionsByEmail(payload.email);

    expect(existingUser).not.toBeNull();
    expect(existingUser?.sessions).toHaveLength(1);

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: payload.email,
        password: payload.password,
      },
    });

    const body = loginRes.json();
    const accessTokenCookie = getCookie(loginRes.cookies, "accessToken");
    const refreshTokenCookie = getCookie(loginRes.cookies, "refreshToken");

    expect(loginRes.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "LOGGED_IN",
      data: {
        user: {
          id: existingUser!.id,
          email: payload.email,
        },
      },
    });
    expect(body.data.accessToken).toBeUndefined();
    expect(body.data.refreshToken).toBeUndefined();
    expect(loginRes.cookies).toEqual(
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
    expect(refreshTokenCookie?.value).toEqual(expect.any(String));

    const userAfterLogin = await findUserWithSessionsByEmail(payload.email);

    expect(userAfterLogin?.sessions).toHaveLength(2);
    const refreshTokenMatches = await Promise.all(
      (userAfterLogin?.sessions ?? []).map(async (session) => {
        return (
          session.refreshToken !== refreshTokenCookie?.value &&
          (await compareRefreshToken(refreshTokenCookie!.value, session.refreshToken))
        );
      }),
    );

    expect(refreshTokenMatches).toContain(true);
  });

  it("should return 401 for an invalid password and not set cookies", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: payload.email,
        password: "wrong-password",
      },
    });

    expect(loginRes.statusCode).toBe(401);
    expect(loginRes.cookies).toHaveLength(0);
    expect(loginRes.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_CREDENTIALS",
      },
    });
  });

  it("should return 401 for a non-existent email and not set cookies", async () => {
    const email = `missing-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email,
        password: "123456",
      },
    });

    expect(loginRes.statusCode).toBe(401);
    expect(loginRes.cookies).toHaveLength(0);
    expect(loginRes.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_CREDENTIALS",
      },
    });
  });

  it("should set login cookies with httpOnly, path, and maxAge", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: payload.email,
        password: payload.password,
      },
    });

    expect(loginRes.statusCode).toBe(200);
    expect(getCookie(loginRes.cookies, "accessToken")).toEqual(
      expect.objectContaining({
        name: "accessToken",
        httpOnly: true,
        path: "/",
        maxAge: 15 * 60,
      }),
    );
    expect(getCookie(loginRes.cookies, "refreshToken")).toEqual(
      expect.objectContaining({
        name: "refreshToken",
        httpOnly: true,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      }),
    );
  });
});
