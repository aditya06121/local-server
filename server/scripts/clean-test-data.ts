import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { ilike } from "drizzle-orm";
import { users } from "../src/db/schema/schema.users.js";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const result = await db
    .delete(users)
    .where(ilike(users.email, "%@mail.com"))
    .returning({ email: users.email });

  console.log(`Deleted ${result.length} test user(s).`);
  if (result.length > 0) {
    result.forEach((r) => console.log(" -", r.email));
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
