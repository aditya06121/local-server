import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// ── Mock child_process before importing the module under test ────────────────

vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import {
  createTerminalSessionToken,
  consumeTerminalSessionToken,
  authenticateOsUser,
} from "../../src/services/terminal.service.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFakeProcess(exitCode: number | null, errorEvent?: Error) {
  const proc = new EventEmitter() as EventEmitter & { stderr: EventEmitter };
  proc.stderr = new EventEmitter();

  // Emit events on next tick so callers have time to attach listeners.
  setImmediate(() => {
    if (errorEvent) {
      proc.emit("error", errorEvent);
    } else {
      proc.emit("close", exitCode);
    }
  });

  return proc;
}

// ── Token lifecycle ──────────────────────────────────────────────────────────

describe("createTerminalSessionToken", () => {
  it("returns a 64-character hex string", () => {
    const token = createTerminalSessionToken("alice");
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different token each call", () => {
    const a = createTerminalSessionToken("alice");
    const b = createTerminalSessionToken("alice");
    expect(a).not.toBe(b);
  });
});

describe("consumeTerminalSessionToken", () => {
  it("returns the username for a valid token", () => {
    const token = createTerminalSessionToken("alice");
    expect(consumeTerminalSessionToken(token)).toBe("alice");
  });

  it("returns null for an unknown token", () => {
    expect(consumeTerminalSessionToken("not-a-real-token")).toBeNull();
  });

  it("is single-use — second call returns null", () => {
    const token = createTerminalSessionToken("alice");
    consumeTerminalSessionToken(token);
    expect(consumeTerminalSessionToken(token)).toBeNull();
  });

  it("returns null for an expired token", () => {
    vi.useFakeTimers();

    const token = createTerminalSessionToken("alice");

    // Advance time past the 60-second TTL.
    vi.advanceTimersByTime(61_000);

    expect(consumeTerminalSessionToken(token)).toBeNull();

    vi.useRealTimers();
  });
});

// ── OS authentication ────────────────────────────────────────────────────────

describe("authenticateOsUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok:true when dscl exits with code 0", async () => {
    vi.mocked(spawn).mockReturnValue(makeFakeProcess(0) as any);

    const result = await authenticateOsUser("alice", "correct-password");

    expect(result).toEqual({ ok: true });
    expect(spawn).toHaveBeenCalledWith(
      "dscl",
      [".", "-authonly", "alice", "correct-password"],
      expect.objectContaining({ stdio: ["ignore", "ignore", "pipe"] }),
    );
  });

  it("returns INVALID_CREDENTIALS when dscl exits with non-zero code", async () => {
    vi.mocked(spawn).mockReturnValue(makeFakeProcess(1) as any);

    const result = await authenticateOsUser("alice", "wrong-password");

    expect(result).toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      details: "Invalid username or password",
    });
  });

  it("returns AUTH_ERROR when the spawn process itself errors", async () => {
    vi.mocked(spawn).mockReturnValue(
      makeFakeProcess(null, new Error("dscl not found")) as any,
    );

    const result = await authenticateOsUser("alice", "any-password");

    expect(result).toEqual({
      ok: false,
      code: "AUTH_ERROR",
      details: expect.stringContaining("dscl not found"),
    });
  });
});
