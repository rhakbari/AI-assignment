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

Four tables (see `prisma/schema.prisma`):

- **User** — id, email (unique), name, passwordHash.
- **Document** — id, title, `content` (HTML), `ownerId`, timestamps.
- **Share** — (documentId, userId, role) with a unique constraint; `role ∈ {VIEWER, EDITOR}`.
- **DocumentVersion** — snapshots for the version-history stretch feature.

SQLite has no enum type, so `role` is a validated string. The unique
`(documentId, userId)` constraint means sharing is an idempotent **upsert** —
re-sharing simply updates the role.

## Access control

All authorization lives in `src/lib/access.ts` as **pure functions**
(`effectiveRole`, `canView`, `canEdit`, `canManage`) so it is trivially unit-tested
and reused identically across every route. Rules:

- **Owner** → full control (edit, rename, delete, manage sharing).
- **Editor** → edit content + rename.
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
create/rename/edit/delete, autosave + reopen, `.txt/.md/.docx` import, share by email
with viewer/editor roles, owned-vs-shared dashboard, server-enforced permissions,
version snapshot/restore, Markdown export, print-to-PDF.

**Intentionally simplified:** no live multi-cursor presence; "collaboration" is
asynchronous (refresh to see a collaborator's saved changes).

## What I'd build next with another 2–4 hours

1. **Live presence + change propagation** — start with polling/SWR revalidation of
   the open document, then a `y-prosemirror` (Yjs) CRDT layer for true real-time.
2. **Optimistic concurrency** — a content version/`updatedAt` check on PATCH so two
   editors saving near-simultaneously can't silently clobber each other.
3. **Comments / suggestion mode** — anchored to ProseMirror ranges.
4. **Server-rendered PDF export** (vs. browser print) for consistent output.
5. **A few integration tests** against the route handlers (login → share → 403 matrix)
   to lock the authorization contract.
