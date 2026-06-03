/**
 * One-time production schema setup for Turso (libSQL).
 *
 * Applies prisma/schema.sql (generated from the Prisma schema) to the Turso
 * database referenced by TURSO_DATABASE_URL / TURSO_AUTH_TOKEN. After this,
 * run `npm run db:seed` with the same env vars to insert the demo data.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/init-turso.mjs
 *
 * To refresh prisma/schema.sql after a schema change:
 *   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/schema.sql
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is required (see .env.example).");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, "..", "prisma", "schema.sql"), "utf-8");

const client = createClient({ url, authToken });

try {
  await client.executeMultiple(sql);
  console.log("✅ Turso schema applied. Next: run `npm run db:seed` with the same env vars.");
} catch (err) {
  console.error("Failed to apply schema:", err);
  process.exit(1);
}
