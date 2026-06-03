# Collab Docs

A lightweight, collaborative document editor inspired by Google Docs. Create and
rich-text–edit documents in the browser, import files, and share documents with
teammates as **viewers** or **editors**.

Built with **Next.js (App Router) + TypeScript + Tiptap + Prisma + SQLite/Turso**.

---

## Features

| Area | What it does |
|------|--------------|
| **Editing** | Rich-text editor (Tiptap): bold, italic, underline, strikethrough, H1–H3, bullet/numbered lists, quotes, links, text alignment, undo/redo. **Autosaves** as you type. |
| **Documents** | Create, rename (inline title), open, delete. Content + structure persist across refresh. |
| **File upload** | Import `.txt`, `.md`, `.docx` → a new editable document. Max **5 MB**. Unsupported types are rejected with a clear message. |
| **Role-based sharing** | Every doc has an **owner**. Share by email with one of three roles: **Viewer** (read-only), **Commenter** (view + comment), **Editor** (full edit). Dashboard separates **My documents** from **Shared with me**. |
| **Real-time presence** | Live avatar stack of who's currently in a document (heartbeat + 5s polling). A banner appears when a collaborator saves changes, with one-click reload. |
| **Comments** | Comment thread per document; optionally **anchored to a text selection**. Add / resolve / reopen / delete, with live updates. |
| **Auth** | Lightweight seeded login (signed httpOnly cookie session). Four demo users covering every role. |
| **Persistence** | Prisma + SQLite locally; Turso (libSQL) in production. |
| **Stretch (all 5 implemented)** | Real-time collaboration indicators · Commenting · Version history (snapshot + restore) · Export (Markdown + Print/Save-as-PDF) · Role-based permissions beyond basic access. |

### Demo accounts

All passwords are `password123`.

| Email | Role in demo data |
|-------|-------------------|
| `alice@ajaia.dev` | **Owner** of "Q3 Product Roadmap"; shares it with everyone below |
| `bob@ajaia.dev`   | **Editor** — can change content of the shared roadmap |
| `carol@ajaia.dev` | **Commenter** — can comment but not edit (left a seeded comment) |
| `dana@ajaia.dev`  | **Viewer** — read-only on the shared roadmap |

> To demo sharing end-to-end: sign in as **Alice**, open *Q3 Product Roadmap*, click **Share**.
> Then sign out and sign in as **Bob** (edit), **Carol** (comment only), or **Dana** (view only).
> Open the same doc in two browsers/accounts to see the **presence avatars** light up.

---

## Run locally

**Prerequisites:** Node.js 18+ (built with Node 24) and npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env          # a working .env is already included for local dev
#   then set SESSION_SECRET to any long random string (openssl rand -base64 32)

# 3. Create the local database schema
npm run db:push

# 4. Seed demo users + documents
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open <http://localhost:3000> and sign in with a demo account.

### Other scripts

```bash
npm run build      # production build (runs prisma generate + next build)
npm start          # run the production build
npm test           # run the Vitest suite (access control + file parsing)
npm run db:reset   # wipe + re-create + reseed the local DB
```

---

## Deploy (Vercel + Turso)

Vercel's filesystem is ephemeral, so production uses **Turso** (hosted libSQL —
SQLite-compatible, free tier). The app automatically uses Turso when
`TURSO_DATABASE_URL` is set; otherwise it uses the local SQLite file.

```bash
# 1. Create a free Turso database  (https://turso.tech)
turso db create collab-docs
turso db show collab-docs --url      # -> TURSO_DATABASE_URL
turso db tokens create collab-docs   # -> TURSO_AUTH_TOKEN

# 2. Create the schema + seed data in Turso (run locally, once)
export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."
npm run db:init:turso                # applies prisma/schema.sql to Turso
npm run db:seed                      # seeds demo users/docs into Turso

# 3. Deploy to Vercel
npm i -g vercel
vercel                               # link/create the project
vercel deploy --prod
```

In the **Vercel project → Settings → Environment Variables**, set:

| Variable | Value |
|----------|-------|
| `SESSION_SECRET` | a long random string |
| `TURSO_DATABASE_URL` | from `turso db show` |
| `TURSO_AUTH_TOKEN` | from `turso db tokens create` |

Vercel auto-detects Next.js and runs `npm run build`. No `vercel.json` needed.

---

## Tech & project structure

- **Next.js 15** (App Router) — single full-stack codebase, route handlers for the API.
- **Tiptap** (ProseMirror) — rich-text editor.
- **Prisma** ORM over **SQLite** (local) / **Turso libSQL** (prod).
- **jose** (JWT) + **bcryptjs** — signed cookie sessions, hashed seeded passwords.
- **zod** — request validation. **sanitize-html** — XSS-safe content storage.
- **mammoth** (.docx), **marked** (.md), **turndown** (Markdown export).
- **Tailwind CSS** + **lucide-react** icons — styling. **Vitest** — tests.

**Design system:** flat design with a slate + blue palette, **Plus Jakarta Sans**
typography, SVG icons throughout (no emoji), soft elevation, 180ms transitions,
visible keyboard focus rings, and `prefers-reduced-motion` support.

```
src/
  app/
    api/                 # route handlers: auth, documents, share, upload, export, versions, comments, presence
    documents/           # dashboard + editor pages (server components)
    login/               # login page
  components/            # client UI: editor, toolbar, dashboard, share dialog, version history, presence bar, comments panel
  lib/
    access.ts            # pure access-control logic (unit-tested)
    auth.ts              # session + password helpers
    db.ts                # Prisma client (SQLite or Turso adapter)
    parse.ts             # file import -> sanitized HTML (unit-tested)
    sanitize.ts          # HTML allow-list
    export.ts, validation.ts, api.ts, client.ts
prisma/
  schema.prisma          # data model
  schema.sql             # generated DDL for Turso provisioning
  seed.ts                # demo users + documents + a shared doc
tests/                   # access.test.ts, parse.test.ts
scripts/init-turso.mjs   # one-time Turso schema setup
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for design decisions, tradeoffs, and what
I deprioritized. See [AI_WORKFLOW.md](./AI_WORKFLOW.md) for how AI tooling was used.
