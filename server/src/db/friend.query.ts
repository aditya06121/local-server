import { randomUUID } from "crypto";
import { and, asc, eq, exists, ilike, not, or } from "drizzle-orm";
import { db } from "../db.js";
import { friends, friendRequests } from "./schema/schema.friends.js";
import { users } from "./schema/schema.users.js";

type TransactionClient = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
type QueryClient = typeof db | TransactionClient;

export async function findUserByEmailExact(
  email: string,
  client: QueryClient = db,
) {
  const [user] = await client
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  return user ?? null;
}

export async function searchUsersByEmailFiltered(
  query: string,
  currentUserId: string,
) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(
      and(
        ilike(users.email, `${query}%`),

        // exclude self
        not(eq(users.id, currentUserId)),

        // exclude existing friends
        not(
          exists(
            db
              .select()
              .from(friends)
              .where(
                and(
                  eq(friends.userId, currentUserId),
                  eq(friends.friendId, users.id),
                ),
              ),
          ),
        ),

        // exclude pending requests (either direction)
        not(
          exists(
            db
              .select()
              .from(friendRequests)
              .where(
                and(
                  eq(friendRequests.status, "pending"),
                  or(
                    and(
                      eq(friendRequests.fromUserId, currentUserId),
                      eq(friendRequests.toUserId, users.id),
                    ),
                    and(
                      eq(friendRequests.fromUserId, users.id),
                      eq(friendRequests.toUserId, currentUserId),
                    ),
                  ),
                ),
              ),
          ),
        ),
      ),
    )
    .orderBy(asc(users.email))
    .limit(10);
}

export async function createFriendRequest(
  fromUserId: string,
  toUserId: string,
  client: QueryClient = db,
) {
  const [request] = await client
    .insert(friendRequests)
    .values({
      id: randomUUID(),
      fromUserId,
      toUserId,
      status: "pending",
    })
    .returning();

  return request;
}

export async function findFriendRequestById(
  id: string,
  client: QueryClient = db,
) {
  const [request] = await client
    .select()
    .from(friendRequests)
    .where(eq(friendRequests.id, id))
    .limit(1);

  return request ?? null;
}

export async function findFriendRequestBetweenUsers(
  userA: string,
  userB: string,
  client: QueryClient = db,
) {
  const [request] = await client
    .select()
    .from(friendRequests)
    .where(
      or(
        and(
          eq(friendRequests.fromUserId, userA),
          eq(friendRequests.toUserId, userB),
        ),
        and(
          eq(friendRequests.fromUserId, userB),
          eq(friendRequests.toUserId, userA),
        ),
      ),
    )
    .limit(1);

  return request ?? null;
}

export async function getPendingRequestsForUser(userId: string) {
  // Requests received by the current user (others sent TO me)
  const received = await db
    .select({
      id: friendRequests.id,
      status: friendRequests.status,
      otherUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(friendRequests)
    .innerJoin(users, eq(friendRequests.fromUserId, users.id))
    .where(
      and(
        eq(friendRequests.toUserId, userId),
        eq(friendRequests.status, "pending"),
      ),
    );

  // Requests sent by the current user (I sent TO others)
  const sent = await db
    .select({
      id: friendRequests.id,
      status: friendRequests.status,
      otherUser: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(friendRequests)
    .innerJoin(users, eq(friendRequests.toUserId, users.id))
    .where(
      and(
        eq(friendRequests.fromUserId, userId),
        eq(friendRequests.status, "pending"),
      ),
    );

  return [
    ...received.map((r) => ({ ...r, direction: "received" as const })),
    ...sent.map((r) => ({ ...r, direction: "sent" as const })),
  ];
}

export async function updateFriendRequestStatus(
  tx: TransactionClient,
  requestId: string,
  status: "accepted" | "rejected",
) {
  await tx
    .update(friendRequests)
    .set({ status })
    .where(eq(friendRequests.id, requestId));
}

export async function resetFriendRequest(
  tx: TransactionClient,
  requestId: string,
  fromUserId: string,
  toUserId: string,
) {
  const [request] = await tx
    .update(friendRequests)
    .set({
      fromUserId,
      toUserId,
      status: "pending",
      createdAt: new Date(),
    })
    .where(eq(friendRequests.id, requestId))
    .returning();

  return request ?? null;
}

export async function deleteFriendRequest(
  tx: TransactionClient,
  requestId: string,
) {
  await tx.delete(friendRequests).where(eq(friendRequests.id, requestId));
}

export async function findFriendship(
  userId: string,
  friendId: string,
  client: QueryClient = db,
) {
  const [friend] = await client
    .select()
    .from(friends)
    .where(and(eq(friends.userId, userId), eq(friends.friendId, friendId)))
    .limit(1);

  return friend ?? null;
}

export async function createFriendship(
  tx: TransactionClient,
  userA: string,
  userB: string,
) {
  await tx
    .insert(friends)
    .values([
      {
        id: randomUUID(),
        userId: userA,
        friendId: userB,
      },
      {
        id: randomUUID(),
        userId: userB,
        friendId: userA,
      },
    ])
    .onConflictDoNothing();
}

export async function deleteFriendship(
  tx: TransactionClient,
  userA: string,
  userB: string,
) {
  await tx
    .delete(friends)
    .where(
      or(
        and(eq(friends.userId, userA), eq(friends.friendId, userB)),
        and(eq(friends.userId, userB), eq(friends.friendId, userA)),
      ),
    );
}

export async function getFriendsByUserId(userId: string) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      bio: users.bio,
      location: users.location,
    })
    .from(friends)
    .innerJoin(users, eq(friends.friendId, users.id))
    .where(eq(friends.userId, userId));
}
