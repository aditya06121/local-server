import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../../src/app.js";
import dbConnect, { prisma } from "../../src/db.js";

const createdEmails = new Set<string>();

function buildRegisterPayload(index: number) {
  const email = `ratelimit-register-${Date.now()}-${index}@mail.com`;
  createdEmails.add(email);

  return {
    name: "aditya",
    email,
    password: "123456",
  };
}

function buildLoginPayload() {
  const email = `ratelimit-login-${Date.now()}@mail.com`;
  createdEmails.add(email);

  return {
    name: "aditya",
    email,
    password: "123456",
  };
}

async function cleanupUsers() {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        in: emails,
      },
    },
  });
}

describe("auth route rate limits", () => {
  beforeAll(async () => {
    await dbConnect();
    await app.ready();
  });

  afterAll(async () => {
    await cleanupUsers();
    await prisma.$disconnect();
  });

  it("should rate limit register requests", async () => {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/auth/register",
        remoteAddress: "10.0.0.1",
        payload: buildRegisterPayload(index),
      });
    }

    expect(lastResponse!.statusCode).toBe(429);
    expect(lastResponse!.cookies).toHaveLength(0);
    expect(lastResponse!.headers["x-ratelimit-limit"]).toBe("10");
    expect(lastResponse!.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });

  it("should rate limit login requests", async () => {
    const payload = buildLoginPayload();

    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      remoteAddress: "10.0.0.2",
      payload,
    });

    expect(registerRes.statusCode).toBe(201);

    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/auth/login",
        remoteAddress: "10.0.0.3",
        payload: {
          email: payload.email,
          password: "wrong-password",
        },
      });
    }

    expect(lastResponse!.statusCode).toBe(429);
    expect(lastResponse!.cookies).toHaveLength(0);
    expect(lastResponse!.headers["x-ratelimit-limit"]).toBe("10");
    expect(lastResponse!.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });

  it("should rate limit refresh-token requests", async () => {
    let lastResponse;

    for (let index = 0; index < 21; index += 1) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/auth/refresh-token",
        remoteAddress: "10.0.0.4",
      });
    }

    expect(lastResponse!.statusCode).toBe(429);
    expect(lastResponse!.cookies).toHaveLength(0);
    expect(lastResponse!.headers["x-ratelimit-limit"]).toBe("20");
    expect(lastResponse!.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });

  it("should rate limit logout requests", async () => {
    let lastResponse;

    for (let index = 0; index < 21; index += 1) {
      lastResponse = await app.inject({
        method: "POST",
        url: "/auth/logout",
        remoteAddress: "10.0.0.5",
      });
    }

    expect(lastResponse!.statusCode).toBe(429);
    expect(lastResponse!.cookies).toHaveLength(0);
    expect(lastResponse!.headers["x-ratelimit-limit"]).toBe("20");
    expect(lastResponse!.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  });
});
