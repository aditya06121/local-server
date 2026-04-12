import { randomUUID } from "crypto";
import { eq, ilike, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { sessions, users } from "./schema/schema.users.js";

type NewUser = {
  name: string;
  email: string;
  password: string;
};

type NewPersistedUser = NewUser & {
  id: string;
};

type NewSession = {
  userId: string;
  tokenId: string;
  refreshToken: string;
  expiresAt: Date;
};

type UpdateUserProfileInput = {
  phone?: string | null;
  bio?: string | null;
  location?: string | null;
};

const publicUserSelection = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  bio: users.bio,
  location: users.location,
};

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function createUser(input: NewUser) {
  const persistedUser: NewPersistedUser = {
    id: randomUUID(),
    ...input,
  };

  const [user] = await db
    .insert(users)
    .values({
      ...persistedUser,
      email: normalizeEmail(persistedUser.email),
    })
    .returning({
      id: users.id,
      email: users.email,
    });

  return user;
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return user ?? null;
}

export async function findUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function deleteUsersByEmails(emails: string[]) {
  if (emails.length === 0) return;

  await db.delete(users).where(inArray(users.email, emails.map(normalizeEmail)));
}

// Deletes every user whose email ends with the given domain suffix.
// Used by the test suite to wipe all test-created rows (cascades to sessions,
// friends, friend_requests, notices via FK ON DELETE CASCADE).
export async function deleteUsersByEmailDomain(domain: string) {
  await db.delete(users).where(ilike(users.email, `%@${domain}`));
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.location !== undefined && { location: input.location }),
    })
    .where(eq(users.id, userId))
    .returning(publicUserSelection);

  return updatedUser ?? null;
}

export async function findPublicUserById(userId: string) {
  const [user] = await db
    .select(publicUserSelection)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
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

export async function createUserWithSession(
  userInput: NewPersistedUser,
  sessionInput: NewSession,
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        ...userInput,
        email: normalizeEmail(userInput.email),
      })
      .returning({
        id: users.id,
        email: users.email,
      });

    await tx.insert(sessions).values({
      id: randomUUID(),
      ...sessionInput,
    });

    return user;
  });
}

export async function findSessionsByUserId(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId));
}

export async function findSessionByTokenId(tokenId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenId, tokenId))
    .limit(1);

  return session ?? null;
}

export async function deleteSessionById(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function rotateSession(
  oldSessionId: string,
  newSession: NewSession,
) {
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.id, oldSessionId));

    await tx.insert(sessions).values({
      id: randomUUID(),
      ...newSession,
    });
  });
}

export async function findUserWithSessionsByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  if (!user) return null;

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
  if (typeof error !== "object" || error === null) return false;

  if ("code" in error && error.code === "23505") return true;

  if ("cause" in error && error.cause) {
    return isUniqueViolation(error.cause);
  }

  return false;
}
