import bcrypt from "bcrypt";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/auth.token.js";
import { createSession, createUser, isUniqueViolation } from "../db/queries.js";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterUserResult =
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
      code: "EMAIL_EXISTS" | "DB_CALL_FAILED";
      details: string;
    };

export async function registerUser(input: RegisterInput) {
  const { name, email, password } = input;

  const hashedPassword = await bcrypt.hash(password, 10);

  let user: { id: string; email: string };

  try {
    user = await createUser({
      name,
      email,
      password: hashedPassword,
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      return {
        ok: false,
        code: "EMAIL_EXISTS",
        details: "Email already exists",
      } satisfies RegisterUserResult;
    }

    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies RegisterUserResult;
  }

  const payload = { userId: user.id, email: user.email };

  const refreshToken = await generateRefreshToken(payload);
  const hashedRefreshToken = await hashRefreshToken(refreshToken);

  try {
    await createSession({
      userId: user.id,
      refreshToken: hashedRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  } catch {
    return {
      ok: false,
      code: "DB_CALL_FAILED",
      details: "Failed to connect to db",
    } satisfies RegisterUserResult;
  }

  const accessToken = await generateAccessToken(payload);

  return {
    ok: true,
    user,
    accessToken,
    refreshToken,
  } satisfies RegisterUserResult;
}
