import "dotenv/config";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";
import bcrypt from "bcrypt";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function getRequiredEnv(name: "ACCESS_TOKEN_SECRET" | "REFRESH_TOKEN_SECRET") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not set`);
  }

  return value;
}

// ---- payload type ----
export type TokenPayload = {
  userId: string;
  email: string;
};

export type RefreshTokenPayload = TokenPayload & {
  tokenId: string;
};

// ---- generators ----
export function generateAccessToken(payload: TokenPayload) {
  return jwt.sign(payload, getRequiredEnv("ACCESS_TOKEN_SECRET"), {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function generateRefreshToken(payload: TokenPayload, tokenId: string) {
  return jwt.sign(payload, getRequiredEnv("REFRESH_TOKEN_SECRET"), {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    jwtid: tokenId,
  });
}

function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashRefreshToken(token: string) {
  return bcrypt.hash(digestToken(token), 10);
}

export async function compareRefreshToken(token: string, hashedToken: string) {
  return bcrypt.compare(digestToken(token), hashedToken);
}

// ---- verifiers ----
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getRequiredEnv("ACCESS_TOKEN_SECRET"));

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    !("email" in decoded)
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    userId: decoded.userId as string,
    email: decoded.email as string,
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, getRequiredEnv("REFRESH_TOKEN_SECRET"));

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    !("email" in decoded) ||
    !("jti" in decoded)
  ) {
    throw new Error("Invalid refresh token payload");
  }

  return {
    userId: decoded.userId as string,
    email: decoded.email as string,
    tokenId: decoded.jti as string,
  };
}
