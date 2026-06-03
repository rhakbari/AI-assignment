# Architecture & Decisions

A short note on what I prioritized, the tradeoffs I made, and what I deliberately
left out under the timebox.

## Goal & priorities

The prompt rewards **depth in a few areas over shallow coverage everywhere**. I
chose to go deep on the three things a "document editor" lives or dies on:

1. **A coherent editing experience** — real rich text, autosave, rename, reopen.
2. **A correct sharing/permission model** — owner vs. viewer vs. editor, enforced
   on the server, with a clear owned-vs-shared distinction in the UI.
3. **Product-relevant file import** — upload `.txt/.md/.docx` and get an editable doc.

Everything else (auth, persistence, deploy) was kept as simple as possible while
still being real.

## Stack choices & why

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | **Next.js (App Router)** | One codebase for UI + API + a single Vercel deploy. Fastest path to a live URL. |
| Editor | **Tiptap** (ProseMirror) | Production-grade rich text. The required marks/nodes (bold/italic/underline/headings/lists) are built in; I add Underline, Link, TextAlign. Avoids hand-rolling contentEditable. |
| Storage format | **Sanitized HTML** | Tiptap round-trips HTML cleanly, it renders directly, and it exports to Markdown trivially (turndown). Storing HTML (vs ProseMirror JSON) keeps the export/print path server-renderable without a ProseMirror runtime. |
| DB / ORM | **Prisma + SQLite → Turso** | SQLite = zero-setup local dev (a file). Turso (libSQL) is SQLite-compatible and works on Vercel's serverless/ephemeral FS. Same schema, one provider, no Docker for reviewers. |
| Auth | **Seeded users + signed cookie** | The prompt explicitly allows mocked/seeded auth. A signed (HS256) httpOnly JWT cookie is enough to model identity and ownership without an external provider — and makes the sharing demo easy (just switch accounts). |
| Validation | **zod** | Single source of truth for request shapes; consistent 400s. |

## Data model

Six tables (see `prisma/schema.prisma`):

- **User** — id, email (unique), name, passwordHash.
- **Document** — id, title, `content` (HTML), `ownerId`, timestamps.
- **Share** — (documentId, userId, role) with a unique constraint; `role ∈ {VIEWER, COMMENTER, EDITOR}`.
- **DocumentVersion** — snapshots for the version-history feature.
- **Comment** — per-document comments; optional `quote` (the selected text it refers to) + `resolved` flag.
- **Presence** — one row per (document, user) with `lastSeenAt`, upserted on heartbeat.

SQLite has no enum type, so `role` is a validated string. The unique
`(documentId, userId)` constraint means sharing is an idempotent **upsert** —
re-sharing simply updates the role.

## Access control

All authorization lives in `src/lib/access.ts` as **pure functions**
(`effectiveRole`, `canView`, `canEdit`, `canManage`) so it is trivially unit-tested
and reused identically across every route. Rules:

- **Owner** → full control (edit, rename, delete, manage sharing).
- **Editor** → edit content + rename + comment.
- **Commenter** → view + comment, but cannot change the document.
- **Viewer** → read-only.
- **Delete and share-management are owner-only.**

Every API route re-checks access server-side; the client UI (hiding the toolbar,
disabling the title, etc.) is convenience only, never the enforcement boundary.
This is verified by the runtime smoke tests (a viewer's PATCH returns 403, etc.).

## Editing & autosave

The editor autosaves on a **800 ms debounce** after the last keystroke (title on a
600 ms debounce), with a live "Saving… / All changes saved" indicator. This keeps
writes cheap while making persistence feel automatic. Pending timers are flushed on
unmount.

## Real-time presence & comments

- **Presence is polling-based**, not WebSocket-based. This is a deliberate
  serverless tradeoff: Vercel functions can't hold long-lived socket connections,
  so a persistent socket server would mean extra infrastructure. Instead the open
  editor upserts a `Presence` heartbeat and polls the active list every 5s; a user
  is "here" if seen in the last 15s. Cheap, stateless, and works on any host.
- The same poll returns the document's `updatedAt`. The client compares it to its
  own last-saved timestamp, so if **another** editor saves, a "collaborator updated
  this document — Reload" banner appears (without clobbering the local buffer).
- **Comments** are anchored to a **quoted text snippet**, not to ProseMirror
  positional offsets. Positional anchoring is fragile under concurrent edits and is
  real work to maintain; quoting the selection gives 90% of the UX value (you can see
  what a comment refers to) for a fraction of the complexity and risk.

## Security

- All stored/rendered HTML — whether typed, pasted, or imported from a `.docx`/`.md`
  — is passed through a **`sanitize-html` allow-list** (`src/lib/sanitize.ts`) before
  it touches the DB. A unit test confirms `<script>` / `onerror` are stripped from
  imported content.
- Sessions are httpOnly, `sameSite=lax`, and `secure` in production. Passwords are
  bcrypt-hashed even though they're seeded.
- Links are forced to `rel="noopener noreferrer"`.

## What I deliberately deprioritized (scope cuts)

- **Real-time collaborative editing (CRDT/OT).** This is the single biggest piece of
  "real" Google Docs and a multi-day effort on its own. I modeled sharing and
  permissions thoroughly instead, which is the product-judgment core.
- **Self-service signup / password reset / email.** Seeded accounts are enough to
  demonstrate ownership and sharing, which is what the prompt asks for.
- **Granular org/role permissions.** Two roles (viewer/editor) + owner cover the spec.
- **Rich `.docx` fidelity** (tables, images, complex styles). Mammoth gives clean
  semantic HTML for headings/lists/emphasis, which matches the editor's capabilities.
- **A component test harness for the React UI.** I invested test effort where bugs
  are most costly and logic is pure: access control and file parsing.

## What's working vs. incomplete

**Working end-to-end** (verified via build + automated tests + scripted runtime checks):
create/rename/edit/delete, autosave + reopen, `.txt/.md/.docx` import, role-based
sharing (viewer/commenter/editor), owned-vs-shared dashboard, server-enforced
permissions, presence indicators + change banner, comments (add/resolve/delete,
selection-anchored), version snapshot/restore, Markdown export, print-to-PDF.

**Intentionally simplified:** presence shows *who is here* and flags when a peer
saved, but document content itself is not live-synced character-by-character — there
is no CRDT/multi-cursor co-editing (you reload to pull a collaborator's saved edits).

## What I'd build next with another 2–4 hours

1. **True real-time co-editing** — upgrade presence-only to a `y-prosemirror` (Yjs)
   CRDT layer with live cursors, served over a WebSocket provider (a small dedicated
   socket service alongside the Vercel app).
2. **Optimistic concurrency** — a content version/`updatedAt` check on PATCH so two
   editors saving near-simultaneously can't silently clobber each other (the current
   reload banner mitigates but doesn't merge).
3. **Suggestion mode** — tracked insert/delete marks on top of the existing comment
   model, with accept/reject.
4. **Positionally-anchored comments** — map comments to ProseMirror ranges (with
   relative positions) so highlights move with the text.
5. **Server-rendered PDF export** (vs. browser print) and a few **integration tests**
   against the route handlers to lock the authorization contract.
