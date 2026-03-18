import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

function createPool() {
  return new Pool({ connectionString });
}

export let pool = createPool();
export let db = drizzle(pool);
const isVitestProcess =
  Boolean(process.env.VITEST) || process.argv.some((arg) => arg.includes("vitest"));

export default async function dbConnect() {
  await pool.query("select 1");
  console.log("connected");
}

export async function closeDb() {
  if (isVitestProcess) {
    return;
  }

  await pool.end();
  pool = createPool();
  db = drizzle(pool);
}
