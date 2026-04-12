import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";

// ── Mock OS auth so tests never call the real dscl binary ────────────────────

vi.mock("../../src/services/terminal.service.js", async (importOriginal) => {
  const real = await importOriginal<
    typeof import("../../src/services/terminal.service.js")
  >();

  return {
    ...real,
    // Replace only the OS-auth function; keep token helpers real.
    authenticateOsUser: vi.fn(),
  };
});

import {
  authenticateOsUser,
  consumeTerminalSessionToken,
} from "../../src/services/terminal.service.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockAuthSuccess() {
  vi.mocked(authenticateOsUser).mockResolvedValue({ ok: true });
}

function mockAuthFailure() {
  vi.mocked(authenticateOsUser).mockResolvedValue({
    ok: false,
    code: "INVALID_CREDENTIALS",
    details: "Invalid username or password",
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /term/auth", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = buildApp();
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns 200 and a session token on valid credentials", async () => {
    mockAuthSuccess();

    const res = await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: { username: "alice", password: "correct-password" },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toMatchObject({
      success: true,
      message: "AUTH_OK",
      data: { token: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });

    expect(authenticateOsUser).toHaveBeenCalledWith("alice", "correct-password");
  });

  it("the returned token is valid and single-use", async () => {
    mockAuthSuccess();

    const res = await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: { username: "alice", password: "correct-password" },
    });

    const { token } = res.json().data as { token: string };

    // First consume succeeds.
    expect(consumeTerminalSessionToken(token)).toBe("alice");
    // Second consume returns null (single-use).
    expect(consumeTerminalSessionToken(token)).toBeNull();
  });

  it("returns 401 on invalid credentials", async () => {
    mockAuthFailure();

    const res = await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: { username: "alice", password: "wrong-password" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({
      success: false,
      error: { code: "INVALID_CREDENTIALS" },
    });
  });

  it("returns 400 when the request body is missing required fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: { username: "alice" }, // missing password
    });

    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for an empty username", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: { username: "", password: "password" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("does not call authenticateOsUser when body validation fails", async () => {
    await app.inject({
      method: "POST",
      url: "/term/auth",
      payload: {},
    });

    expect(authenticateOsUser).not.toHaveBeenCalled();
  });
});
