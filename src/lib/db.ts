import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

/**
 * One Prisma client for the whole app.
 *
 * - Production (Vercel): when TURSO_DATABASE_URL is set we use the libSQL
 *   driver adapter so the same SQLite schema runs against Turso, which is
 *   safe on serverless (Vercel's local filesystem is ephemeral).
 * - Local dev: no Turso env -> Prisma talks to the SQLite file in DATABASE_URL.
 *
 * The client is cached on globalThis so Next's dev hot-reload does not open a
 * new connection on every change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ adapter });
  }
  // On a serverless host (e.g. Vercel) the local SQLite file does not exist, so
  // every query would fail with an opaque error. Make the misconfiguration loud.
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[db] TURSO_DATABASE_URL is not set in production. " +
        "The local SQLite file is unavailable on serverless hosts — " +
        "set TURSO_DATABASE_URL / TURSO_AUTH_TOKEN and run `npm run db:init:turso` + `npm run db:seed`.",
    );
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
