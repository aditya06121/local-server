import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { ilike } from "drizzle-orm";
import { users } from "../src/db/schema/schema.users.js";

// All test users are created with @mail.com emails. Deleting them cascades to
// sessions, friends, friend_requests, and notices via FK ON DELETE CASCADE.
const TEST_EMAIL_DOMAIN = "mail.com";

async function cleanTestData() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const result = await db
    .delete(users)
    .where(ilike(users.email, `%@${TEST_EMAIL_DOMAIN}`))
    .returning({ email: users.email });

  await pool.end();

  return result.length;
}

export async function setup() {
  const deleted = await cleanTestData();
  if (deleted > 0) {
    console.log(`[global-setup] Cleared ${deleted} leftover test user(s) before run.`);
  }
}

export async function teardown() {
  const deleted = await cleanTestData();
  if (deleted > 0) {
    console.log(`[global-setup] Cleaned up ${deleted} test user(s) after run.`);
  }
}
