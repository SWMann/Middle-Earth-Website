import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

/**
 * Lazy DB accessor. We don't instantiate the Postgres client at module load
 * so that pages which never touch the DB can render even when DATABASE_URL
 * is unset (useful during Phase 1 setup before .env.local is filled in).
 *
 * Anything that calls `db.<query>` requires DATABASE_URL — it just fails at
 * call time with a clear message instead of crashing the whole import graph.
 */
function getDb(): Db {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy apps/website/.env.example to .env.local and fill it in.",
    );
  }
  const client = postgres(connectionString, {
    max: 8,
    ssl: connectionString.includes("localhost") ? false : "require",
  });
  cached = drizzle(client, { schema });
  return cached;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export { schema };
