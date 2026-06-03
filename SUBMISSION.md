# Submission

Lightweight collaborative document editor ("Collab Docs"). This file lists exactly
what is included and the status of each requirement.

## What's in this folder

| Item | File / location |
|------|-----------------|
| Source code | this repository (`src/`, `prisma/`, `tests/`, `scripts/`) |
| Setup & run instructions | [README.md](./README.md) |
| Architecture note | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| AI workflow note | [AI_WORKFLOW.md](./AI_WORKFLOW.md) |
| Automated tests | [tests/](./tests/) — run with `npm test` |
| Production DB provisioning | `prisma/schema.sql`, `scripts/init-turso.mjs` |
| Walkthrough video link | [VIDEO.md](./VIDEO.md) |
| Live product URL | see **Live deployment** below |

## Requirement status

| Requirement | Status |
|-------------|--------|
| Create / rename / edit / save / reopen documents | ✅ Working |
| Rich text (bold, italic, underline, headings, lists) | ✅ Working (+ strikethrough, quote, link, alignment) |
| File upload → editable document (`.txt`, `.md`, `.docx`, ≤5 MB) | ✅ Working |
| Sharing: owner + grant access + owned-vs-shared distinction | ✅ Working |
| Persistence across refresh | ✅ Working (SQLite local / Turso prod) |
| Validation & error handling | ✅ zod validation, typed API errors, friendly UI messages |
| At least one meaningful automated test | ✅ 22 tests (access-control matrix + file parsing/XSS) |
| Architecture note | ✅ ARCHITECTURE.md |
| Clear setup/run instructions | ✅ README.md |
| **Stretch: real-time collaboration indicators** | ✅ Presence avatars (heartbeat + poll) + "collaborator updated" reload banner |
| **Stretch: commenting / suggestion mode** | ✅ Comments (selection-anchored, add/resolve/delete, live) |
| **Stretch: version history** | ✅ Snapshot + restore |
| **Stretch: export to PDF or Markdown** | ✅ Markdown download + Print/Save-as-PDF |
| **Stretch: role-based permissions beyond basic access** | ✅ Viewer / Commenter / Editor + owner |

## Run locally (summary)

```bash
npm install
npm run db:push
npm run db:seed
npm run dev      # http://localhost:3000
npm test         # automated tests
```

Full details, including production deployment, in [README.md](./README.md).

## Credentials / test accounts

Seeded users — password for all is **`password123`**:

| Email | Use for |
|-------|---------|
| `alice@ajaia.dev` | **Owner** of "Q3 Product Roadmap"; manages sharing |
| `bob@ajaia.dev` | **Editor** — can change content |
| `carol@ajaia.dev` | **Commenter** — can comment, not edit (left a seeded comment) |
| `dana@ajaia.dev` | **Viewer** — read-only |

**Suggested review path:** sign in as Alice → open *Q3 Product Roadmap* → **Share**
(note Viewer/Commenter/Editor roles) → open the doc in a second browser as Bob to see
**presence avatars** → as Carol add a **comment** → as Dana confirm read-only.

## Live deployment

> ⚠️ **Action required by submitter:** the app is deploy-ready (Vercel + Turso) but
> must be deployed under your own Vercel/Turso accounts — see the
> **Deploy** section in [README.md](./README.md). Paste the resulting URL here:
>
> **Live URL:** _<add after `vercel deploy --prod`>_

## Walkthrough video

> ⚠️ **Action required by submitter:** record the 3–5 min walkthrough and add the
> unlisted Loom/YouTube link to [VIDEO.md](./VIDEO.md).

## Known limitations

- **Presence is polling-based** (heartbeat + 5s poll) and shows *who is here* + flags
  when a peer saves; document content is **not** live character-synced (no CRDT
  multi-cursor co-editing — reload to pull a peer's saved edits). Deliberate
  serverless tradeoff; rationale + next steps in ARCHITECTURE.md.
- Comments are anchored to a **quoted snippet**, not to live ProseMirror positions.
- `.docx` import preserves semantic structure (headings/lists/emphasis), not complex
  layout (tables, images, columns).
