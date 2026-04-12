import { randomBytes } from "crypto";
import { spawn } from "child_process";

// ── Session token store ──────────────────────────────────────────────────────

type SessionEntry = {
  username: string;
  expiresAt: number;
};

const SESSION_TTL_MS = 60_000; // 60 seconds — window to open the WS
const sessions = new Map<string, SessionEntry>();

// Purge expired tokens every 30 seconds so the Map doesn't grow unboundedly.
setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of sessions) {
    if (entry.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}, 30_000).unref(); // .unref() so the interval doesn't keep the process alive

export function createTerminalSessionToken(username: string): string {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

/**
 * Validate and consume a terminal session token.
 * Returns the username on success, null if the token is missing or expired.
 * Each token is single-use: it is removed from the store immediately.
 */
export function consumeTerminalSessionToken(token: string): string | null {
  const entry = sessions.get(token);
  if (!entry) return null;

  sessions.delete(token); // consume regardless — prevent replay

  if (entry.expiresAt <= Date.now()) return null;

  return entry.username;
}

// ── OS authentication ────────────────────────────────────────────────────────

export type AuthOsResult =
  | { ok: true }
  | { ok: false; code: "INVALID_CREDENTIALS" | "AUTH_ERROR"; details: string };

/**
 * Verify an OS account's username/password via `dscl` (macOS Directory Service).
 * Returns ok:true only when dscl exits with code 0 (credentials valid).
 */
export function authenticateOsUser(
  username: string,
  password: string,
): Promise<AuthOsResult> {
  return new Promise((resolve) => {
    // dscl . -authonly <username> <password>
    // Exit 0 → credentials valid; non-zero → invalid.
    const proc = spawn("dscl", [".", "-authonly", username, password], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true });
      } else {
        resolve({
          ok: false,
          code: "INVALID_CREDENTIALS",
          details: "Invalid username or password",
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        ok: false,
        code: "AUTH_ERROR",
        details: `Auth process error: ${err.message}`,
      });
    });
  });
}
