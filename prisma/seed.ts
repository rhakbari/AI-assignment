/**
 * Seed script: creates demo users and a few documents, including one shared
 * document so the owned-vs-shared distinction is visible on first login.
 *
 * Run with:  npm run db:seed   (or `npm run db:reset` to wipe + reseed)
 *
 * Demo accounts (all use password: password123). Alice owns the roadmap and
 * shares it to demonstrate every role:
 *   alice@ajaia.dev  -> owner
 *   bob@ajaia.dev    -> EDITOR   (can change content)
 *   carol@ajaia.dev  -> COMMENTER (can comment, cannot edit)
 *   dana@ajaia.dev   -> VIEWER   (read-only)
 */

// Node 20.12+/24 built-in .env loader (npm scripts don't auto-load .env for tsx).
try {
  (process as NodeJS.Process & { loadEnvFile?: () => void }).loadEnvFile?.();
} catch {
  /* .env optional; DATABASE_URL may be set in the environment */
}

import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

// Mirror src/lib/db.ts: seed Turso in production, the local SQLite file otherwise.
const prisma = process.env.TURSO_DATABASE_URL
  ? new PrismaClient({
      adapter: new PrismaLibSQL({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
    })
  : new PrismaClient();

const PASSWORD = "password123";

const WELCOME_HTML = `
<h1>Welcome to Collab Docs</h1>
<p>This is a lightweight collaborative editor inspired by Google Docs. Try the toolbar above:</p>
<ul>
  <li><strong>Bold</strong>, <em>italic</em>, and <u>underline</u> text</li>
  <li>Headings and three text sizes</li>
  <li>Bulleted and numbered lists</li>
</ul>
<h2>Getting started</h2>
<ol>
  <li>Edit this document — it autosaves as you type.</li>
  <li>Rename it from the title field at the top.</li>
  <li>Share it with a teammate using the <strong>Share</strong> button.</li>
</ol>
<p>Everything persists, so refreshing the page keeps your work.</p>
`.trim();

const ROADMAP_HTML = `
<h1>Q3 Product Roadmap</h1>
<p>Shared with the team. <strong>Bob can edit</strong>; <strong>Carol can view</strong>.</p>
<h2>Themes</h2>
<ul>
  <li>Faster collaboration</li>
  <li>Better file import</li>
  <li>Sharing &amp; permissions</li>
</ul>
<h2>Milestones</h2>
<ol>
  <li>Editor polish</li>
  <li>Real-time presence</li>
  <li>Comments</li>
</ol>
`.trim();

const NOTES_HTML = `
<h1>Engineering Notes</h1>
<p>Bob's private working doc. Not shared with anyone yet.</p>
<p>Use <em>italic</em> for asides and <strong>bold</strong> for decisions.</p>
`.trim();

async function main() {
  // Idempotent reseed: clear documents (cascades to shares/versions/comments/presence), keep users.
  await prisma.comment.deleteMany();
  await prisma.presence.deleteMany();
  await prisma.documentVersion.deleteMany();
  await prisma.share.deleteMany();
  await prisma.document.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const alice = await prisma.user.upsert({
    where: { email: "alice@ajaia.dev" },
    update: { name: "Alice Nguyen", passwordHash },
    create: { email: "alice@ajaia.dev", name: "Alice Nguyen", passwordHash },
  });
  const bob = await prisma.user.upsert({
    where: { email: "bob@ajaia.dev" },
    update: { name: "Bob Singh", passwordHash },
    create: { email: "bob@ajaia.dev", name: "Bob Singh", passwordHash },
  });
  const carol = await prisma.user.upsert({
    where: { email: "carol@ajaia.dev" },
    update: { name: "Carol Diaz", passwordHash },
    create: { email: "carol@ajaia.dev", name: "Carol Diaz", passwordHash },
  });
  const dana = await prisma.user.upsert({
    where: { email: "dana@ajaia.dev" },
    update: { name: "Dana Lee", passwordHash },
    create: { email: "dana@ajaia.dev", name: "Dana Lee", passwordHash },
  });

  await prisma.document.create({
    data: { title: "Welcome to Collab Docs", content: WELCOME_HTML, ownerId: alice.id },
  });

  const roadmap = await prisma.document.create({
    data: { title: "Q3 Product Roadmap", content: ROADMAP_HTML, ownerId: alice.id },
  });

  await prisma.document.create({
    data: { title: "Engineering Notes", content: NOTES_HTML, ownerId: bob.id },
  });

  // Demonstrate role-based sharing across every role.
  await prisma.share.createMany({
    data: [
      { documentId: roadmap.id, userId: bob.id, role: "EDITOR" },
      { documentId: roadmap.id, userId: carol.id, role: "COMMENTER" },
      { documentId: roadmap.id, userId: dana.id, role: "VIEWER" },
    ],
  });

  // A sample comment so the commenting feature is visible on first open.
  await prisma.comment.create({
    data: {
      documentId: roadmap.id,
      authorId: carol.id,
      body: "Can we add a target date to this milestone?",
      quote: "Real-time presence",
    },
  });

  console.log("Seeded users: alice, bob, carol, dana @ajaia.dev (password: password123)");
  console.log("'Q3 Product Roadmap' shared: Bob=EDITOR, Carol=COMMENTER, Dana=VIEWER; + 1 sample comment.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
