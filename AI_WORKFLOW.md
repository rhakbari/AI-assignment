# AI-Native Workflow Note

This project was built in an AI-assisted workflow. The note below is an honest
account of where AI helped, what I overrode, and how I kept judgment in the loop.

## Tools used

- **Claude Code (Opus)** as the primary pair-programmer / implementation agent —
  scaffolding, boilerplate, and first drafts of routes, components, and tests.
- The model's web/knowledge for **API specifics** of fast-moving libraries
  (Next.js 15 async `params`/`cookies`, Tiptap v2 `immediatelyRender` for SSR,
  the Prisma 6 libSQL driver-adapter constructor).

## Where AI materially sped things up

- **Scaffolding the full slice fast.** Project config (Next/TS/Tailwind/Prisma),
  the CRUD + sharing + upload + versions route handlers, and the Tiptap editor +
  toolbar were generated far quicker than hand-typing. This is what made depth in
  *three* areas feasible inside the timebox.
- **Library glue I'd otherwise look up.** Correct Tiptap extension wiring,
  `sanitize-html` allow-list shape, `mammoth`/`marked`/`turndown` usage, and the
  libSQL adapter wiring were drafted from memory of current APIs, then verified.
- **Tests.** The Vitest cases for access control and file parsing (including the
  XSS-sanitization assertion) were generated and then tightened.

## What I changed or rejected from AI output

- **Database/deploy strategy.** The initial instinct was "SQLite everywhere," which
  silently breaks on Vercel's ephemeral filesystem. I rejected that and chose a
  SQLite-locally / **Turso-in-production** split via the libSQL adapter, plus a
  generated `schema.sql` + init script so production provisioning doesn't depend on
  Prisma's still-evolving migrate-adapter for libSQL.
- **Auth scope.** I cut a generated full email/password signup flow down to **seeded
  accounts + a signed cookie** — the prompt allows mocked auth, and switching seeded
  users is the *better* way to demo sharing.
- **Security hardening the model under-specified.** I made HTML sanitization a hard
  boundary on **every** write path (typed, pasted, and imported `.docx`/`.md`), not
  just on render, and added a test that proves `<script>`/`onerror` are stripped.
- **Authorization placement.** I insisted permission checks live in **pure functions
  re-checked server-side on every route**, rather than trusting client-side UI gating
  that an AI draft is happy to lean on.
- Trimmed over-eager extras (icon libraries, speculative abstractions) to keep the
  surface small and reviewable.

## How I verified correctness, UX, and reliability

- **Automated tests** (`npm test`) — 20 passing cases over the pure logic most likely
  to harbor bugs: the access-control matrix and the file-import/sanitization pipeline.
- **Production build** (`npm run build`) — type-checks the whole app and confirms the
  SSR/route boundaries compile (caught Next 15 async-`params` issues early).
- **Scripted runtime smoke tests** — against the running server I exercised the real
  authorization contract with `curl`: login + bad-password 401, owned-vs-shared
  listing, a **viewer's edit returning 403**, an **editor's edit returning 200**,
  no-access GET returning 403, owner-only delete, `.md` upload → structured HTML,
  unsupported upload → 415, and version snapshot/restore.
- **UX** was checked by driving the actual flows (create → format → autosave →
  reopen → share → switch account → confirm role-appropriate access).

The throughline: **AI wrote a lot of the first draft; I owned the architecture,
the security boundaries, the scope cuts, and the verification.**
