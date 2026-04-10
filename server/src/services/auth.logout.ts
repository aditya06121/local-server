import {
  compareRefreshToken,
  verifyRefreshToken,
} from "../utils/auth.token.js";
import { deleteSessionById, findSessionByTokenId } from "../db/user.query.js";

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

  let session;

  try {
    session = await findSessionByTokenId(payload.tokenId);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LogoutUserResult;
  }

  if (!session || session.userId !== payload.userId) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies LogoutUserResult;
  }

  const isMatch = await compareRefreshToken(refreshToken, session.refreshToken);

  if (!isMatch) {
    return {
      ok: false,
      code: "INVALID_TOKEN",
      details: "Invalid token",
    } satisfies LogoutUserResult;
  }

  try {
    await deleteSessionById(session.id);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LogoutUserResult;
  }

  return { ok: true } satisfies LogoutUserResult;
}
