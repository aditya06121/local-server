import { randomUUID } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { sessions, users } from "./schema.js";

type NewUser = {
  name: string;
  email: string;
  password: string;
};

type NewSession = {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
};

export async function createUser(input: NewUser) {
  const [user] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      ...input,
    })
    .returning({
      id: users.id,
      email: users.email,
    });

  return user;
}

export async function createSession(input: NewSession) {
  const [session] = await db
    .insert(sessions)
    .values({
      id: randomUUID(),
      ...input,
    })
    .returning();

  return session;
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function findSessionsByUserId(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId));
}

export async function deleteSessionById(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function rotateSession(oldSessionId: string, newSession: NewSession) {
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.id, oldSessionId));
    await tx.insert(sessions).values({
      id: randomUUID(),
      ...newSession,
    });
  });
}

export async function deleteUsersByEmails(emails: string[]) {
  if (emails.length === 0) {
    return;
  }

  await db.delete(users).where(inArray(users.email, emails));
}

export async function findUserWithSessionsByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    return null;
  }

  const relatedSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, user.id));

  return {
    ...user,
    sessions: relatedSessions,
  };
}

export function isUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if ("code" in error && error.code === "23505") {
    return true;
  }

  if ("cause" in error && error.cause) {
    return isUniqueViolation(error.cause);
  }

  return false;
}
