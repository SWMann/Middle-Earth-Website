// One-shot script to apply the initial web.* migration to Neon.
// Use this when drizzle-kit's interactive `push` can't run (e.g. non-TTY).
//
// Run with: node --env-file=.env.local scripts/db-bootstrap.mjs

import postgres from "postgres";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: "require" });

const dir = path.resolve("lib/db/migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  const body = readFileSync(path.join(dir, file), "utf8");
  const statements = body
    .split(/--> statement-breakpoint/)
    .map((s) => s.trim())
    .filter(Boolean);
  console.log(`[${file}] ${statements.length} statements`);
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
    } catch (err) {
      if (err.code === "42P06" || err.code === "42P07") {
        // 42P06 = duplicate_schema, 42P07 = duplicate_table — idempotent retry.
        console.log(`  · skipped (already exists): ${err.message.split("\n")[0]}`);
      } else {
        console.error(`  ✗ ${err.message}`);
        await sql.end();
        process.exit(1);
      }
    }
  }
}

console.log("✓ migrations applied");
await sql.end();
