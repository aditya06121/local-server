import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";

import { buildApp } from "../../src/app.js";
import dbConnect, { closeDb } from "../../src/db.js";
import {
  deleteUsersByEmails,
  findUserById,
} from "../../src/db/user.query.js";

let app: FastifyInstance;

const createdEmails = new Set<string>();
const runId = Date.now();
let emailSequence = 0;
let remoteAddressSequence = 0;

function nextEmail(prefix: string) {
  emailSequence += 1;

  const email = `${prefix}-${runId}-${emailSequence}@mail.com`;
  createdEmails.add(email);

  return email;
}

function nextRemoteAddress() {
  remoteAddressSequence += 1;
  return `10.20.0.${(remoteAddressSequence % 240) + 1}`;
}

function getCookieValue(
  cookies: Array<{
    name: string;
    value?: string;
  }>,
  name: string,
) {
  return cookies.find((cookie) => cookie.name === name)?.value;
}

async function cleanupUsers() {
  const emails = [...createdEmails];

  if (emails.length === 0) {
    return;
  }

  await deleteUsersByEmails(emails);
}

async function registerUser(prefix: string) {
  const payload = {
    name: `${prefix} name`,
    email: nextEmail(prefix),
    password: "123456",
  };

  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    remoteAddress: nextRemoteAddress(),
    payload,
  });

  expect(response.statusCode).toBe(201);

  const body = response.json() as {
    data: {
      user: {
        id: string;
        email: string;
      };
    };
  };

  return {
    payload,
    user: body.data.user,
    accessToken: getCookieValue(response.cookies, "accessToken")!,
  };
}

describe("/users/me", () => {
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

  it("returns the authenticated profile without exposing the password hash", async () => {
    const user = await registerUser("profile-get");

    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: user.accessToken,
      },
    });

    const body = response.json() as {
      success: boolean;
      message: string;
      data: {
        user: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          bio: string | null;
          location: string | null;
          password?: string;
        };
      };
    };

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      message: "PROFILE_FETCHED",
      data: {
        user: {
          id: user.user.id,
          name: user.payload.name,
          email: user.payload.email,
          phone: null,
          bio: null,
          location: null,
        },
      },
    });
    expect(body.data.user.password).toBeUndefined();

    const storedUser = await findUserById(user.user.id);

    expect(storedUser).not.toBeNull();
    expect(storedUser?.email).toBe(user.payload.email);
  });

  it("updates profile fields and persists the changes", async () => {
    const user = await registerUser("profile-update");
    const payload = {
      phone: "+91-9999999999",
      bio: "Backend engineer",
      location: "Pune",
    };

    const updateResponse = await app.inject({
      method: "PATCH",
      url: "/users/me",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: user.accessToken,
      },
      payload,
    });

    const updateBody = updateResponse.json() as {
      data: {
        user: {
          id: string;
          phone: string | null;
          bio: string | null;
          location: string | null;
        };
      };
    };

    expect(updateResponse.statusCode).toBe(200);
    expect(updateBody).toMatchObject({
      data: {
        user: {
          id: user.user.id,
          ...payload,
        },
      },
    });

    const storedUser = await findUserById(user.user.id);

    expect(storedUser).not.toBeNull();
    expect(storedUser?.phone).toBe(payload.phone);
    expect(storedUser?.bio).toBe(payload.bio);
    expect(storedUser?.location).toBe(payload.location);

    const getResponse = await app.inject({
      method: "GET",
      url: "/users/me",
      remoteAddress: nextRemoteAddress(),
      cookies: {
        accessToken: user.accessToken,
      },
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      data: {
        user: payload,
      },
    });
  });

  it("returns 401 when the access token cookie is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/users/me",
      remoteAddress: nextRemoteAddress(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Request failed",
      error: {
        code: "UNAUTHORIZED",
      },
    });
  });
});
