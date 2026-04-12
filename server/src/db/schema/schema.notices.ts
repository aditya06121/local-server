import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./schema.users.js";

export const notices = pgTable(
  "Notice",
  {
    id: text("id").primaryKey(),

    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    content: text("content").notNull(),

    createdAt: timestamp("createdAt", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("Notice_userId_idx").on(table.userId),
    index("Notice_createdAt_idx").on(table.createdAt),
  ],
);

export type Notice = typeof notices.$inferSelect;
