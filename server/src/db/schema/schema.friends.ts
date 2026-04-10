import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./schema.users.js";

export const friendRequests = pgTable(
  "FriendRequest",
  {
    id: text("id").primaryKey(),

    fromUserId: text("fromUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    toUserId: text("toUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: text("status").notNull(), // "pending" | "accepted" | "rejected"

    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("FriendRequest_unique_unordered_pair").on(
      sql`least(${table.fromUserId}, ${table.toUserId})`,
      sql`greatest(${table.fromUserId}, ${table.toUserId})`,
    ),
    index("FriendRequest_toUserId_status_idx").on(table.toUserId, table.status),
    index("FriendRequest_fromUserId_status_idx").on(
      table.fromUserId,
      table.status,
    ),
  ],
);

export const friends = pgTable(
  "Friend",
  {
    id: text("id").primaryKey(),

    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    friendId: text("friendId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("Friend_unique_pair").on(table.userId, table.friendId),
  ],
);
