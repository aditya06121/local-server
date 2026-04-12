import { randomUUID } from "crypto";
import { and, asc, desc, eq, lt, or } from "drizzle-orm";
import { db } from "../db.js";
import { notices } from "./schema/schema.notices.js";
import { users } from "./schema/schema.users.js";

const DEFAULT_PAGE_SIZE = 20;

// Encodes a cursor from a notice's createdAt + id so the client can page through results.
// Format: base64(`${timestamp}_${id}`)
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.getTime()}_${id}`).toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separatorIndex = raw.lastIndexOf("_");
    if (separatorIndex === -1) return null;
    const ts = Number(raw.slice(0, separatorIndex));
    const id = raw.slice(separatorIndex + 1);
    if (!Number.isFinite(ts) || !id) return null;
    return { createdAt: new Date(ts), id };
  } catch {
    return null;
  }
}

export async function createNotice(userId: string, content: string) {
  const id = randomUUID();

  await db.insert(notices).values({ id, userId, content });

  const [notice] = await db
    .select({
      id: notices.id,
      content: notices.content,
      createdAt: notices.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(notices)
    .innerJoin(users, eq(notices.userId, users.id))
    .where(eq(notices.id, id))
    .limit(1);

  return notice;
}

export async function getNoticesPaginated(cursor?: string, limit = DEFAULT_PAGE_SIZE) {
  // Fetch one extra to determine whether a next page exists.
  const fetchLimit = limit + 1;

  const parsed = cursor ? decodeCursor(cursor) : null;

  const rows = await db
    .select({
      id: notices.id,
      content: notices.content,
      createdAt: notices.createdAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(notices)
    .innerJoin(users, eq(notices.userId, users.id))
    .where(
      parsed
        ? or(
            lt(notices.createdAt, parsed.createdAt),
            and(
              eq(notices.createdAt, parsed.createdAt),
              lt(notices.id, parsed.id),
            ),
          )
        : undefined,
    )
    .orderBy(desc(notices.createdAt), desc(notices.id))
    .limit(fetchLimit);

  const hasNextPage = rows.length === fetchLimit;
  const items = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasNextPage && items.length > 0
      ? encodeCursor(items[items.length - 1].createdAt, items[items.length - 1].id)
      : null;

  return { notices: items, nextCursor };
}

export async function findNoticeById(id: string) {
  const [notice] = await db
    .select()
    .from(notices)
    .where(eq(notices.id, id))
    .limit(1);

  return notice ?? null;
}

export async function deleteNotice(id: string) {
  await db.delete(notices).where(eq(notices.id, id));
}

export async function deleteNoticesByUserIds(userIds: string[]) {
  if (userIds.length === 0) return;
  for (const userId of userIds) {
    await db.delete(notices).where(eq(notices.userId, userId));
  }
}
