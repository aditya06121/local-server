import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import dbConnect, { closeDb } from "../../src/db.js";
import { deleteUsersByEmails } from "../../src/db/queries.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

const createdEmails = new Set<string>();

function buildRegisterPayload() {
  const email = `me-${Date.now()}-${Math.random().toString(36).slice(2)}@mail.com`;
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

describe("GET /auth/me", () => {
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

  it("should return 200 with the authenticated user from the access token", async () => {
    const payload = buildRegisterPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    const accessTokenCookie = getCookie(registerRes.cookies, "accessToken");
    expect(accessTokenCookie?.value).toEqual(expect.any(String));

    const meRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: {
        accessToken: accessTokenCookie!.value,
      },
    });

    expect(meRes.statusCode).toBe(200);
    expect(meRes.json()).toMatchObject({
      success: true,
      message: "USER_FETCHED",
      data: {
        user: {
          email: payload.email,
        },
      },
    });
  });

  it("should return 401 when access token cookie is missing", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });

  it("should return 401 when access token is invalid", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: {
        accessToken: "invalid-token",
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "INVALID_TOKEN",
      },
    });
  });
});
