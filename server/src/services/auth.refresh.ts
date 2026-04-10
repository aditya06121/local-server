import { randomUUID } from "crypto";
import {
  compareRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.token.js";
import { findSessionByTokenId, rotateSession } from "../db/user.query.js";

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

  let session;

  try {
    session = await findSessionByTokenId(payload.tokenId);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies RefreshAccessTokenResult;
  }

  if (!session || session.userId !== payload.userId) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies RefreshAccessTokenResult;
  }

  const isMatch = await compareRefreshToken(oldRefreshToken, session.refreshToken);

  if (!isMatch) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies RefreshAccessTokenResult;
  }

  const nextTokenId = randomUUID();
  const newRefreshToken = generateRefreshToken(
    { userId: payload.userId, email: payload.email },
    nextTokenId,
  );
  const hashed = await hashRefreshToken(newRefreshToken);

  try {
    await rotateSession(session.id, {
      userId: payload.userId,
      tokenId: nextTokenId,
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

  const accessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
  });

  return {
    ok: true,
    accessToken,
    refreshToken: newRefreshToken,
  } satisfies RefreshAccessTokenResult;
}
