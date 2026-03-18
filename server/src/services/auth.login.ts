import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/auth.token.js";
import type { User } from "../db/schema.js";
import { createSession, findUserByEmail } from "../db/queries.js";

type LoginInput = {
  email: string;
  password: string;
};

export type LoginUserResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
      };
      accessToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      code: "INVALID_CREDENTIALS" | "DB_CALL_FAILED";
      details: string;
    };

export async function loginUser(input: LoginInput) {
  const { email, password } = input;
  let existing: User | null;
  try {
    existing = await findUserByEmail(email);
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LoginUserResult;
  }
  if (!existing) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      details: "Invalid email or password",
    } satisfies LoginUserResult;
  }
  const dbPass = existing.password;
  const isMatch = await bcrypt.compare(password, dbPass);
  if (!isMatch) {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      details: "Invalid email or password",
    } satisfies LoginUserResult;
  }
  const payload = { userId: existing.id, email: existing.email };
  const refreshToken = await generateRefreshToken(payload);
  const hashedRefreshToken = await hashRefreshToken(refreshToken);
  try {
    await createSession({
      userId: existing.id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies LoginUserResult;
  }
  const accessToken = await generateAccessToken(payload);
  const user = {
    id: existing.id,
    email: existing.email,
  };
  return {
    ok: true,
    user,
    accessToken,
    refreshToken,
  } satisfies LoginUserResult;
}
