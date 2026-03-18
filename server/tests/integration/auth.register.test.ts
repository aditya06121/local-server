import bcrypt from "bcrypt";
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

function buildPayload() {
  const email = `register-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;
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

describe("POST /auth/register", () => {
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

  it("should return 201, persist the user, hash password, and set auth cookies", async () => {
    const payload = buildPayload();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    const body = res.json();
    const accessTokenCookie = getCookie(res.cookies, "accessToken");
    const refreshTokenCookie = getCookie(res.cookies, "refreshToken");

    expect(res.statusCode).toBe(201);
    expect(body).toMatchObject({
      success: true,
      message: "USER_CREATED",
      data: {
        user: {
          id: expect.any(String),
          email: payload.email,
        },
      },
    });
    expect(body.data.accessToken).toBeUndefined();
    expect(body.data.refreshToken).toBeUndefined();

    expect(res.cookies).toEqual(
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

    const user = await findUserWithSessionsByEmail(payload.email);

    expect(user).not.toBeNull();
    expect(user?.id).toBe(body.data.user.id);
    expect(user?.password).not.toBe(payload.password);
    expect(await bcrypt.compare(payload.password, user!.password)).toBe(true);
    expect(user?.sessions).toHaveLength(1);
    expect(user?.sessions[0]?.refreshToken).not.toBe(refreshTokenCookie?.value);
    expect(
      await compareRefreshToken(
        refreshTokenCookie!.value,
        user!.sessions[0]!.refreshToken,
      ),
    ).toBe(true);
  });

  it("should return 409 when email already exists and not set cookies", async () => {
    const payload = buildPayload();

    const first = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(second.statusCode).toBe(409);
    expect(second.cookies).toHaveLength(0);
    expect(second.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "EMAIL_EXISTS",
      },
    });
  });

  it("should set auth cookies with httpOnly, path, and maxAge", async () => {
    const payload = buildPayload();

    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(res.statusCode).toBe(201);
    expect(getCookie(res.cookies, "accessToken")).toEqual(
      expect.objectContaining({
        name: "accessToken",
        httpOnly: true,
        path: "/",
        maxAge: 15 * 60,
      }),
    );
    expect(getCookie(res.cookies, "refreshToken")).toEqual(
      expect.objectContaining({
        name: "refreshToken",
        httpOnly: true,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      }),
    );
  });
});
