import {
  compareRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.token.js";
import { findSessionsByUserId, rotateSession } from "../db/queries.js";

export type RefreshAccessTokenResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      code: "INVALID_TOKEN" | "DB_CALL_FAILED";
      details?: string;
    };

export async function refreshAccessToken(oldRefreshToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies RefreshAccessTokenResult;
  }

  let sessions;

  try {
    sessions = await findSessionsByUserId(payload.userId);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies RefreshAccessTokenResult;
  }

  let matchedSession = null;

  for (const session of sessions) {
    const isMatch = await compareRefreshToken(oldRefreshToken, session.refreshToken);
    if (isMatch) {
      matchedSession = session;
      break;
    }
  }

  if (!matchedSession) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies RefreshAccessTokenResult;
  }

  // rotate refresh token
  const newRefreshToken = generateRefreshToken(payload);
  const hashed = await hashRefreshToken(newRefreshToken);

  try {
    await rotateSession(matchedSession.id, {
      userId: payload.userId,
      refreshToken: hashed,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies RefreshAccessTokenResult;
  }

  const accessToken = generateAccessToken(payload);

  return {
    ok: true,
    accessToken,
    refreshToken: newRefreshToken,
  } satisfies RefreshAccessTokenResult;
}
