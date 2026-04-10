import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/auth.token.js";
import {
  createUserWithSession,
  isUniqueViolation,
} from "../db/user.query.js";

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
  const { name, password } = input;
  const email = input.email.toLowerCase().trim();

  const hashedPassword = await bcrypt.hash(password, 10);
  const userId = randomUUID();
  const tokenId = randomUUID();
  const payload = { userId, email };
  const refreshToken = await generateRefreshToken(payload, tokenId);
  const hashedRefreshToken = await hashRefreshToken(refreshToken);
  let user: { id: string; email: string };

  try {
    user = await createUserWithSession(
      {
        id: userId,
        name,
        email,
        password: hashedPassword,
      },
      {
        userId,
        tokenId,
        refreshToken: hashedRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    );
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

  const accessToken = await generateAccessToken(payload);

  return {
    ok: true,
    user,
    accessToken,
    refreshToken,
  } satisfies RegisterUserResult;
}
