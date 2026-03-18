import { compareRefreshToken, verifyRefreshToken } from "../utils/auth.token.js";
import { deleteSessionById, findSessionsByUserId } from "../db/queries.js";

export type LogoutUserResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      code: "INVALID_TOKEN" | "DB_CALL_FAILED";
      details?: string;
    };

export async function logoutUser(refreshToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies LogoutUserResult;
  }

  let sessions;

  try {
    sessions = await findSessionsByUserId(payload.userId);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LogoutUserResult;
  }

  let matchedSession = null;

  for (const session of sessions) {
    const isMatch = await compareRefreshToken(refreshToken, session.refreshToken);
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
    } satisfies LogoutUserResult;
  }

  try {
    await deleteSessionById(matchedSession.id);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LogoutUserResult;
  }

  return { ok: true } satisfies LogoutUserResult;
}
