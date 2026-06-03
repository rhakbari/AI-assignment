# Submission — Collab Docs

A lightweight, collaborative document editor inspired by Google Docs. Create and
rich-text–edit documents in the browser, import files, comment, see who else is in
the doc, snapshot/restore versions, export, and share with teammates under a real
role-based permission model — all in one Next.js full-stack codebase.

This document is the single source of truth for **what was built and how it works**.
It catalogs every feature, the code that implements it, the API surface, the data
model, security, testing, and how to run and deploy the app.

- **Setup & run:** [README.md](./README.md)
- **Design decisions & tradeoffs:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **How AI tooling was used:** [AI_WORKFLOW.md](./AI_WORKFLOW.md)
- **Walkthrough video:** [VIDEO.md](./VIDEO.md)

---

## 1. At a glance

| | |
|---|---|
| **Product** | Collab Docs — Google-Docs-style collaborative editor |
| **Stack** | Next.js 15 (App Router) · TypeScript · Tiptap · Prisma · SQLite → Turso |
| **Auth** | Seeded users + signed httpOnly JWT cookie (jose, HS256) |
| **Core requirements** | All met (CRUD, rich text, upload, sharing, persistence, validation, tests) |
| **Stretch features** | **All 5 shipped** (presence · comments · versions · export · roles) |
| **Tests** | 22 Vitest tests (access-control matrix + file parse/XSS) |
| **Data model** | 6 tables (User, Document, Share, DocumentVersion, Comment, Presence) |
| **API routes** | 13 route handlers covering auth, documents, share, upload, export, versions, comments, presence |

---

## 2. Tech stack & why

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | **Next.js 15 (App Router)** | One codebase for UI + API + a single Vercel deploy. Route handlers are the API. |
| Editor | **Tiptap** (ProseMirror) | Production-grade rich text; required marks/nodes built in. Adds Underline, Link, TextAlign, Placeholder. |
| Storage format | **Sanitized HTML** | Tiptap round-trips HTML cleanly, renders directly, and exports to Markdown trivially. No ProseMirror runtime needed server-side. |
| DB / ORM | **Prisma + SQLite → Turso (libSQL)** | Zero-setup local dev (a file); Turso is SQLite-compatible and serverless-safe on Vercel. Same schema, one provider, no Docker. |
| Auth | **Seeded users + signed cookie** | Prompt allows mocked/seeded auth. HS256 httpOnly JWT models identity + ownership; switching accounts makes the sharing demo trivial. |
| Validation | **zod** | Single source of truth for request shapes → consistent 400s. |
| Sanitization | **sanitize-html** | Allow-list on all stored/rendered HTML (typed, pasted, or imported). |
| File import | **mammoth** (.docx), **marked** (.md) | Clean semantic HTML from uploads. |
| Export | **turndown** | HTML → Markdown for download. |
| UI | **Tailwind CSS** + **lucide-react** | Flat slate/blue design system, SVG icons (no emoji). |
| Tests | **Vitest** | Fast unit tests on pure logic (access + parse). |

**Design system:** flat design, slate + blue palette, Plus Jakarta Sans typography,
SVG icons throughout, soft elevation, ~180 ms transitions, visible keyboard focus
rings, and `prefers-reduced-motion` support.

---

## 3. Feature catalog

Each feature lists **what it does**, **how it works**, the **files/endpoints**
involved, and the **permission** required.

### 3.1 Authentication & sessions

- **What:** Lightweight login with four seeded demo users; signed session cookie;
  logout; "who am I" endpoint.
- **How:** `POST /api/auth/login` validates `{email, password}` with zod, looks up
  the user, verifies the **bcrypt** password hash, and on success mints an **HS256
  JWT** (`jose`) carrying the user id (`sub`), set as an **httpOnly** cookie
  (`sameSite=lax`, `secure` in production, 7-day expiry). `getCurrentUser()` verifies
  the cookie on every request; `requireUser()` throws `UnauthorizedError` → 401 when
  absent.
- **Files:** [src/lib/auth.ts](src/lib/auth.ts), [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts), [src/app/api/auth/logout/route.ts](src/app/api/auth/logout/route.ts), [src/app/api/auth/me/route.ts](src/app/api/auth/me/route.ts), [src/components/LoginForm.tsx](src/components/LoginForm.tsx), [src/app/login/page.tsx](src/app/login/page.tsx)
- **Permission:** public (login); authenticated (me/logout).

### 3.2 Document CRUD (create / rename / edit / save / reopen / delete)

- **What:** Create blank documents, rename inline via the title field, edit rich-text
  content, autosave, reopen with full persistence, and delete (owner only).
- **How:**
  - `GET /api/documents` returns the current user's documents split into **`owned`**
    and **`shared`**, each annotated with the effective `role` and owner info, ordered
    by `updatedAt desc`.
  - `POST /api/documents` creates a blank doc (`<h1></h1><p></p>` starter content)
    owned by the caller → 201.
  - `GET /api/documents/[id]` returns the full document if the caller `canView`;
    includes `role`, owner, and — **only for the owner** — the share list.
  - `PATCH /api/documents/[id]` updates title and/or content; requires `canEdit`;
    content is **sanitized** before write; partial updates supported (title-only or
    content-only) and validated so an empty patch is rejected.
  - `DELETE /api/documents/[id]` removes the doc; **owner only** (`canManage`);
    cascades to shares/versions/comments/presence.
- **Files:** [src/app/api/documents/route.ts](src/app/api/documents/route.ts), [src/app/api/documents/[id]/route.ts](src/app/api/documents/[id]/route.ts), [src/app/documents/page.tsx](src/app/documents/page.tsx), [src/app/documents/[id]/page.tsx](src/app/documents/[id]/page.tsx), [src/components/DashboardClient.tsx](src/components/DashboardClient.tsx), [src/components/DocumentEditor.tsx](src/components/DocumentEditor.tsx)
- **Permission:** view = any role; edit/rename = owner/editor; delete = owner.

### 3.3 Rich-text editing & autosave

- **What:** Full toolbar — **bold, italic, underline, strikethrough, H1–H3,
  bullet/numbered lists, blockquote, link, text alignment (left/center/right/justify),
  undo/redo**. Content autosaves as you type.
- **How:** Tiptap `StarterKit` + `Underline` + `Link` + `TextAlign` + `Placeholder`.
  Content **autosaves on an 800 ms debounce** after the last keystroke; the **title
  autosaves on a 600 ms debounce**. A live indicator shows **"Saving… / All changes
  saved / error"**. Pending debounce timers are flushed on unmount so no edit is lost
  when navigating away. The toolbar and title are disabled for non-editors (UI
  convenience; the server is the real boundary).
- **Files:** [src/components/DocumentEditor.tsx](src/components/DocumentEditor.tsx), [src/components/EditorToolbar.tsx](src/components/EditorToolbar.tsx)
- **Permission:** owner/editor to mutate; viewers/commenters get a read-only editor.

### 3.4 File upload → editable document

- **What:** Import a **`.txt`, `.md`/`.markdown`, or `.docx`** file (≤ **5 MB**) and
  get a new editable document. Unsupported types and oversize/empty files are rejected
  with clear messages.
- **How:** `POST /api/upload` accepts multipart form-data (single `file` field),
  guards size (`413` if > 5 MB) and emptiness (`400`), then `parseUploadedFile()`
  converts by extension:
  - `.txt` → paragraphs (blank lines split paragraphs, single newlines → `<br>`,
    HTML-escaped).
  - `.md`/`.markdown` → HTML via **marked**.
  - `.docx` → semantic HTML via **mammoth**.
  - anything else → `UnsupportedFileError` → **415**.
  The resulting HTML is **always sanitized** before storage; the document title is
  derived from the filename (path + extension stripped).
- **Files:** [src/lib/parse.ts](src/lib/parse.ts), [src/app/api/upload/route.ts](src/app/api/upload/route.ts), [src/components/DashboardClient.tsx](src/components/DashboardClient.tsx)
- **Permission:** any authenticated user (creates a doc they own).
- **Note:** `.docx` preserves semantic structure (headings/lists/emphasis), not complex
  layout (tables, images, columns).

### 3.5 Role-based sharing & permissions *(stretch: roles beyond basic access)*

- **What:** Every document has exactly one **owner**. The owner shares by email with
  one of three roles: **Viewer** (read-only), **Commenter** (view + comment), **Editor**
  (full edit). The dashboard separates **My documents** from **Shared with me**.
- **How:** Authorization is centralized in [src/lib/access.ts](src/lib/access.ts) as **pure
  functions** — `effectiveRole`, `canView`, `canEdit`, `canComment`, `canManage` —
  with no DB/Next dependency, so they are trivially unit-tested and reused identically
  across every route. Sharing endpoints:
  - `GET /api/documents/[id]/share` — list collaborators (**owner only**).
  - `POST /api/documents/[id]/share` — grant/update access by email; **idempotent
    upsert** on the unique `(documentId, userId)` constraint (re-sharing updates the
    role); rejects sharing to a non-existent user (404) or to yourself (400).
  - `DELETE /api/documents/[id]/share?userId=…` — revoke access (**owner only**).
  The owner manages all of this from the **Share dialog**.
- **Files:** [src/lib/access.ts](src/lib/access.ts), [src/app/api/documents/[id]/share/route.ts](src/app/api/documents/[id]/share/route.ts), [src/components/ShareDialog.tsx](src/components/ShareDialog.tsx)
- **Permission:** share management = owner only; effective role enforced everywhere.

### 3.6 Real-time presence indicators *(stretch: collaboration indicators)*

- **What:** A live avatar stack of who is currently in the document, plus a
  **"collaborator updated this document — Reload"** banner when a peer saves.
- **How:** **Polling-based**, not WebSocket (a deliberate serverless tradeoff — Vercel
  functions can't hold long-lived sockets). The open editor:
  - `POST /api/documents/[id]/presence` — upserts a heartbeat (`lastSeenAt`) every few
    seconds.
  - `GET /api/documents/[id]/presence` (polled every **5 s**) — returns everyone seen
    within the last **15 s** (with name, effective role, and `isSelf`) **plus the
    document's `updatedAt`**.
  The client compares the returned `updatedAt` to its own last-saved timestamp; if
  **another** editor saved, the reload banner appears **without clobbering the local
  buffer**.
- **Files:** [src/app/api/documents/[id]/presence/route.ts](src/app/api/documents/[id]/presence/route.ts), [src/components/PresenceBar.tsx](src/components/PresenceBar.tsx), [src/components/DocumentEditor.tsx](src/components/DocumentEditor.tsx)
- **Permission:** any role with view access.

### 3.7 Comments *(stretch: commenting)*

- **What:** A per-document comment thread; comments can be **anchored to a quoted text
  selection**. Add, resolve/reopen, and delete, with live updates.
- **How:**
  - `GET /api/documents/[id]/comments` — list (anyone with view access); ordered
    unresolved-first, then newest-first.
  - `POST /api/documents/[id]/comments` — add a comment with optional `quote` (the
    selected text); requires `canComment` (owner/editor/commenter).
  - `PATCH /api/documents/[id]/comments/[commentId]` — resolve/reopen (anyone who can
    comment).
  - `DELETE /api/documents/[id]/comments/[commentId]` — delete; **author or document
    owner** only.
  The comment panel polls for live updates. Comments are anchored by **quoted snippet**,
  not fragile ProseMirror positional offsets — ~90% of the UX value (you can see what a
  comment refers to) at a fraction of the complexity/risk.
- **Files:** [src/app/api/documents/[id]/comments/route.ts](src/app/api/documents/[id]/comments/route.ts), [src/app/api/documents/[id]/comments/[commentId]/route.ts](src/app/api/documents/[id]/comments/[commentId]/route.ts), [src/components/CommentsPanel.tsx](src/components/CommentsPanel.tsx)
- **Permission:** view to read; owner/editor/commenter to add/resolve; author or owner to delete.

### 3.8 Version history *(stretch: version history)*

- **What:** Snapshot the current document state on demand and **restore** any prior
  snapshot. Restore is itself reversible.
- **How:**
  - `GET /api/documents/[id]/versions` — list snapshots (view access), newest-first,
    with title + author + timestamp.
  - `POST /api/documents/[id]/versions` — capture a snapshot of current title+content
    (edit access).
  - `POST /api/documents/[id]/versions/[versionId]/restore` — restore a version in a
    **transaction** that first snapshots the *current* state (so the restore can be
    undone), then overwrites the document (edit access).
- **Files:** [src/app/api/documents/[id]/versions/route.ts](src/app/api/documents/[id]/versions/route.ts), [src/app/api/documents/[id]/versions/[versionId]/restore/route.ts](src/app/api/documents/[id]/versions/[versionId]/restore/route.ts), [src/components/VersionHistory.tsx](src/components/VersionHistory.tsx)
- **Permission:** list = view; snapshot/restore = owner/editor.

### 3.9 Export *(stretch: export to PDF or Markdown)*

- **What:** Download a document as **Markdown**, and **Print / Save-as-PDF** from the
  browser.
- **How:**
  - `GET /api/documents/[id]/export?format=md` — converts stored HTML to Markdown via
    **turndown**, prepends the title as an H1, and streams it as a download with a
    slugified filename (`Content-Disposition: attachment`). Requires view access.
  - **Print-to-PDF** uses the browser's native print path from the editor (print
    button), so no server-side PDF runtime is needed.
- **Files:** [src/lib/export.ts](src/lib/export.ts), [src/app/api/documents/[id]/export/route.ts](src/app/api/documents/[id]/export/route.ts), [src/components/DocumentEditor.tsx](src/components/DocumentEditor.tsx)
- **Permission:** any role with view access.

### 3.10 Persistence

- **What:** All content and structure survive refresh and reopen.
- **How:** Prisma over **SQLite** locally (`prisma/dev.db`) and **Turso libSQL** in
  production. [src/lib/db.ts](src/lib/db.ts) auto-selects the libSQL driver adapter when
  `TURSO_DATABASE_URL` is set, otherwise the local file; the client is cached on
  `globalThis` to survive dev hot-reload, and logs a loud error if run in production
  without Turso configured.
- **Files:** [src/lib/db.ts](src/lib/db.ts), [prisma/schema.prisma](prisma/schema.prisma)

---

## 4. Data model

Six tables (see [prisma/schema.prisma](prisma/schema.prisma)). SQLite has no native enum, so
`role` is a validated string.

| Table | Key fields | Notes |
|-------|-----------|-------|
| **User** | `id`, `email` (unique), `name`, `passwordHash` | bcrypt-hashed passwords. |
| **Document** | `id`, `title`, `content` (sanitized HTML), `ownerId`, `createdAt`, `updatedAt` | indexed by `ownerId`; `updatedAt` auto-managed. |
| **Share** | `(documentId, userId, role)` | unique `(documentId, userId)` → sharing is an idempotent upsert. `role ∈ {VIEWER, COMMENTER, EDITOR}`. |
| **DocumentVersion** | `documentId`, `authorId`, `title`, `content`, `createdAt` | snapshots for version history. |
| **Comment** | `documentId`, `authorId`, `body`, `quote?`, `resolved`, `createdAt` | `quote` = optional anchored selection. |
| **Presence** | `(documentId, userId)`, `lastSeenAt` | unique per (doc, user); upserted on heartbeat; "active" = seen ≤ 15 s. |

All child relations use `onDelete: Cascade`, so deleting a document cleanly removes
its shares, versions, comments, and presence rows.

---

## 5. API reference

All routes require an authenticated session (cookie) unless noted. Errors use a
consistent `{ error, details? }` shape via [src/lib/api.ts](src/lib/api.ts), which maps
`UnauthorizedError → 401`, `ZodError → 400`, `UnsupportedFileError → 415`, and
anything else → 500.

| Method | Path | Purpose | Min. permission |
|--------|------|---------|-----------------|
| POST | `/api/auth/login` | Sign in, set session cookie | public |
| POST | `/api/auth/logout` | Clear session | authenticated |
| GET | `/api/auth/me` | Current user | authenticated |
| GET | `/api/documents` | List owned + shared docs | authenticated |
| POST | `/api/documents` | Create blank doc | authenticated |
| GET | `/api/documents/[id]` | Read a doc (+ shares if owner) | view |
| PATCH | `/api/documents/[id]` | Rename / edit content | edit |
| DELETE | `/api/documents/[id]` | Delete doc | owner |
| POST | `/api/upload` | File → new doc | authenticated |
| GET | `/api/documents/[id]/share` | List collaborators | owner |
| POST | `/api/documents/[id]/share` | Grant/update access by email | owner |
| DELETE | `/api/documents/[id]/share?userId=` | Revoke access | owner |
| GET | `/api/documents/[id]/export?format=md` | Download Markdown | view |
| GET | `/api/documents/[id]/versions` | List snapshots | view |
| POST | `/api/documents/[id]/versions` | Snapshot current state | edit |
| POST | `/api/documents/[id]/versions/[versionId]/restore` | Restore a snapshot | edit |
| GET | `/api/documents/[id]/comments` | List comments | view |
| POST | `/api/documents/[id]/comments` | Add comment | comment |
| PATCH | `/api/documents/[id]/comments/[commentId]` | Resolve/reopen | comment |
| DELETE | `/api/documents/[id]/comments/[commentId]` | Delete comment | author or owner |
| POST | `/api/documents/[id]/presence` | Heartbeat | view |
| GET | `/api/documents/[id]/presence` | Active users + `updatedAt` | view |

---

## 6. Access-control matrix

Effective roles, most → least privileged: **OWNER → EDITOR → COMMENTER → VIEWER**.
Every API route re-checks access **server-side**; the client UI (hiding toolbar,
disabling the title) is convenience only, never the enforcement boundary.

| Action | Owner | Editor | Commenter | Viewer |
|--------|:-----:|:------:|:---------:|:------:|
| View document | ✅ | ✅ | ✅ | ✅ |
| Edit content / rename | ✅ | ✅ | ❌ | ❌ |
| Add / resolve comments | ✅ | ✅ | ✅ | ❌ |
| Snapshot / restore versions | ✅ | ✅ | ❌ | ❌ |
| Export / print | ✅ | ✅ | ✅ | ✅ |
| Manage sharing | ✅ | ❌ | ❌ | ❌ |
| Delete document | ✅ | ❌ | ❌ | ❌ |
| Delete a comment | ✅ (any) | author's own | author's own | — |

This matrix is encoded in [src/lib/access.ts](src/lib/access.ts) and verified by the unit
tests in [tests/access.test.ts](tests/access.test.ts).

---

## 7. Security

- **HTML sanitization (XSS):** all stored/rendered HTML — typed, pasted, or imported
  from `.docx`/`.md` — passes through a **`sanitize-html` allow-list**
  ([src/lib/sanitize.ts](src/lib/sanitize.ts)) before it touches the DB. The allow-list
  matches exactly what the Tiptap editor can produce (headings, marks, lists, links,
  alignment styles). Links are forced to `rel="noopener noreferrer" target="_blank"`,
  and schemes are restricted to `http`/`https`/`mailto`. A unit test confirms
  `<script>` and `onerror` are stripped from imported content.
- **Sessions:** httpOnly, `sameSite=lax`, `secure` in production, HS256-signed, 7-day
  expiry. `SESSION_SECRET` must be ≥ 16 chars or the app throws loudly.
- **Passwords:** bcrypt-hashed (cost 10) even though seeded.
- **Authorization:** enforced on every route via the pure access functions; the UI is
  never the boundary.
- **Validation:** every request body is parsed with zod; failures return `400` with
  field-level details.

---

## 8. Testing

**22 Vitest tests**, focused where bugs are most costly and logic is pure:

- [tests/access.test.ts](tests/access.test.ts) — the full access-control matrix:
  `effectiveRole`, `canView`, `canEdit`, `canComment`, `canManage`, `isShareRole`,
  including stranger-denial and unknown-role normalization to VIEWER.
- [tests/parse.test.ts](tests/parse.test.ts) — file parsing and **XSS defense**: extension
  detection, title-from-filename, `.txt`→paragraphs with HTML escaping, `.md`→HTML,
  `.txt`/`.md` import end-to-end, **`<script>`/`onerror` stripping**, and rejection of
  unsupported types.

```bash
npm test        # vitest run
```

Beyond unit tests, the build is verified clean (`npm run build`) and the running app
was smoke-checked (e.g. a viewer's PATCH returns 403).

---

## 9. Project structure

```
src/
  app/
    api/
      auth/{login,logout,me}/route.ts
      documents/route.ts                          # list + create
      documents/[id]/route.ts                     # read/patch/delete
      documents/[id]/share/route.ts               # list/grant/revoke
      documents/[id]/export/route.ts              # markdown download
      documents/[id]/versions/route.ts            # list/snapshot
      documents/[id]/versions/[versionId]/restore/route.ts
      documents/[id]/comments/route.ts            # list/add
      documents/[id]/comments/[commentId]/route.ts # resolve/delete
      documents/[id]/presence/route.ts            # heartbeat/list
      upload/route.ts                             # file -> doc
    documents/         # dashboard + editor pages (server components)
    login/             # login page
    layout.tsx, globals.css, page.tsx
  components/          # client UI
    DocumentEditor.tsx, EditorToolbar.tsx, DashboardClient.tsx,
    ShareDialog.tsx, VersionHistory.tsx, PresenceBar.tsx,
    CommentsPanel.tsx, LoginForm.tsx, AppHeader.tsx, Toast.tsx
  lib/
    access.ts          # pure access-control logic (unit-tested)
    auth.ts            # session + password helpers
    db.ts              # Prisma client (SQLite or Turso adapter)
    parse.ts           # file import -> sanitized HTML (unit-tested)
    sanitize.ts        # HTML allow-list
    export.ts          # HTML -> Markdown, slugify
    validation.ts      # zod request schemas
    api.ts             # server error mapping
    client.ts          # browser fetch helpers
prisma/
  schema.prisma        # data model (6 tables)
  schema.sql           # generated DDL for Turso provisioning
  seed.ts              # demo users + docs + a shared doc + sample comment
scripts/init-turso.mjs # one-time Turso schema setup
tests/                 # access.test.ts, parse.test.ts
```

---

## 10. Run locally

**Prerequisites:** Node.js 18+ (built with Node 24) and npm.

```bash
npm install
cp .env.example .env       # working local .env is included; set SESSION_SECRET
npm run db:push            # create local SQLite schema
npm run db:seed            # seed demo users + documents
npm run dev                # http://localhost:3000
npm test                   # run the 22-test Vitest suite
```

Other scripts: `npm run build` (prisma generate + next build), `npm start`,
`npm run db:reset` (wipe + recreate + reseed).

---

## 11. Deploy (Vercel + Turso)

Vercel's filesystem is ephemeral, so production uses **Turso** (hosted libSQL). The app
auto-selects Turso when `TURSO_DATABASE_URL` is set.

```bash
turso db create collab-docs
turso db show collab-docs --url      # -> TURSO_DATABASE_URL
turso db tokens create collab-docs   # -> TURSO_AUTH_TOKEN

export TURSO_DATABASE_URL="libsql://..."
export TURSO_AUTH_TOKEN="..."
npm run db:init:turso                # applies prisma/schema.sql to Turso
npm run db:seed                      # seeds demo data into Turso

vercel && vercel deploy --prod
```

Set `SESSION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` in
**Vercel → Settings → Environment Variables**. Vercel auto-detects Next.js and runs
`npm run build`; no `vercel.json` needed.

---

## 12. Demo accounts & suggested review path

All passwords are **`password123`**. Alice owns "Q3 Product Roadmap" and shares it to
demonstrate every role.

| Email | Role in demo data |
|-------|-------------------|
| `alice@ajaia.dev` | **Owner** — manages sharing |
| `bob@ajaia.dev` | **Editor** — can change content |
| `carol@ajaia.dev` | **Commenter** — can comment, not edit (left a seeded comment) |
| `dana@ajaia.dev` | **Viewer** — read-only |

**Suggested path:** sign in as **Alice** → open *Q3 Product Roadmap* → **Share** (note
the Viewer/Commenter/Editor roles) → open the same doc in a second browser as **Bob**
to see **presence avatars** light up → as **Carol** add a **comment** → as **Dana**
confirm read-only.

---

## 13. Requirement status

| Requirement | Status |
|-------------|--------|
| Create / rename / edit / save / reopen documents | ✅ Working |
| Rich text (bold, italic, underline, headings, lists) | ✅ Working (+ strikethrough, quote, link, alignment, undo/redo) |
| File upload → editable document (`.txt`, `.md`, `.docx`, ≤ 5 MB) | ✅ Working |
| Sharing: owner + grant access + owned-vs-shared distinction | ✅ Working |
| Persistence across refresh | ✅ Working (SQLite local / Turso prod) |
| Validation & error handling | ✅ zod validation, typed API errors, friendly UI messages |
| At least one meaningful automated test | ✅ 22 tests (access matrix + parse/XSS) |
| Architecture note | ✅ [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Clear setup/run instructions | ✅ [README.md](./README.md) |
| **Stretch: real-time collaboration indicators** | ✅ Presence avatars + change/reload banner |
| **Stretch: commenting / suggestion mode** | ✅ Comments (selection-anchored, add/resolve/delete, live) |
| **Stretch: version history** | ✅ Snapshot + reversible restore |
| **Stretch: export to PDF or Markdown** | ✅ Markdown download + Print/Save-as-PDF |
| **Stretch: role-based permissions beyond basic access** | ✅ Viewer / Commenter / Editor + owner |

---

## 14. Known limitations & deliberate scope cuts

- **Presence is polling-based** (heartbeat + 5 s poll). It shows *who is here* and
  flags when a peer saves, but document content is **not** live character-synced — no
  CRDT/multi-cursor co-editing (reload to pull a peer's saved edits). Deliberate
  serverless tradeoff; rationale in [ARCHITECTURE.md](./ARCHITECTURE.md).
- **Comments anchor to a quoted snippet**, not live ProseMirror positions.
- **`.docx` import** preserves semantic structure (headings/lists/emphasis), not complex
  layout (tables, images, columns).
- **No self-service signup / password reset / email** — seeded accounts suffice to
  demonstrate ownership and sharing.
- **PDF export is browser print**, not server-rendered.

### What I'd build next (2–4 hours)

1. True real-time co-editing via `y-prosemirror` (Yjs CRDT) + a WebSocket provider.
2. Optimistic concurrency on PATCH (version/`updatedAt` check) to prevent silent clobbers.
3. Suggestion mode (tracked insert/delete marks with accept/reject).
4. Positionally-anchored comments mapped to ProseMirror ranges.
5. Server-rendered PDF export + integration tests against the route handlers.

---

## 15. Action items for the submitter

> ⚠️ Two items require **your own accounts** and cannot be done from the repo alone:
>
> 1. **Deploy** under your own Vercel + Turso accounts (§11) and paste the live URL
>    below.
> 2. **Record** the 3–5 min walkthrough and add the link to [VIDEO.md](./VIDEO.md).
>
> **Live URL:** https://ai-assignment-eight.vercel.app/
>
> **Walkthrough video:** https://www.youtube.com/watch?v=t8L_4k_7SyI
