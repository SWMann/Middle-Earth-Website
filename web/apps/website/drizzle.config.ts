import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Next.js loads .env.local automatically at runtime; drizzle-kit doesn't.
loadEnv({ path: ".env.local" });

export default {
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  schemaFilter: ["web", "game", "audit"],
  verbose: true,
  strict: true,
} satisfies Config;
