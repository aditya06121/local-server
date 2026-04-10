import { relations, sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { friends, friendRequests } from "./schema.friends.js";

export const users = pgTable(
  "User",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),

    // optional additional details
    phone: text("phone"),
    bio: text("bio"),
    location: text("location"),
  },
  (table) => [
    uniqueIndex("User_email_lower_key").on(sql`lower(${table.email})`),
  ],
);

export const sessions = pgTable("Session", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenId: text("tokenId").notNull(),
  refreshToken: text("refreshToken").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expiresAt", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
}, (table) => [
  uniqueIndex("Session_tokenId_key").on(table.tokenId),
  index("Session_userId_idx").on(table.userId),
]);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),

  friends: many(friends),

  sentRequests: many(friendRequests, {
    relationName: "fromUser",
  }),

  receivedRequests: many(friendRequests, {
    relationName: "toUser",
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
  }),
}));

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  fromUser: one(users, {
    fields: [friendRequests.fromUserId],
    references: [users.id],
    relationName: "fromUser",
  }),
  toUser: one(users, {
    fields: [friendRequests.toUserId],
    references: [users.id],
    relationName: "toUser",
  }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
