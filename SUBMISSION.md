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
| Sharing: owner + grant access + owned-vs-shared distinction | ✅ Working (Viewer/Editor roles) |
| Persistence across refresh | ✅ Working (SQLite local / Turso prod) |
| Validation & error handling | ✅ zod validation, typed API errors, friendly UI messages |
| At least one meaningful automated test | ✅ 20 tests (access control + file parsing/XSS) |
| Architecture note | ✅ ARCHITECTURE.md |
| Clear setup/run instructions | ✅ README.md |
| **Stretch: version history** | ✅ Snapshot + restore |
| **Stretch: export** | ✅ Markdown download + Print/Save-as-PDF |

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
| `alice@ajaia.dev` | Owner; shares "Q3 Product Roadmap" with Bob (edit) and Carol (view) |
| `bob@ajaia.dev` | Demonstrates **Editor** access on a shared doc |
| `carol@ajaia.dev` | Demonstrates **Viewer** (read-only) access |

**Suggested review path for sharing:** sign in as Alice → open *Q3 Product Roadmap*
→ **Share** → sign out → sign in as Carol (view only) then Bob (can edit).

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

- Collaboration is **asynchronous** — no live multi-cursor presence; refresh to see a
  collaborator's saved edits. (Rationale and next steps in ARCHITECTURE.md.)
- `.docx` import preserves semantic structure (headings/lists/emphasis), not complex
  layout (tables, images, columns).
