---
stepsCompleted: [context, starter, decisions, patterns, structure, validation]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-todo-bmad.md
workflowType: architecture
status: draft
---

# Architecture — todo-bmad

**Author:** Luca Romagnoli
**Date:** 2026-04-27

## 1. Context

A single-user web app with a clear client/server split. The client renders the UI and issues REST calls; the server owns persistence and validation. SQLite is embedded, so there is exactly one container that needs the DB file (the backend) — no separate database service.

## 2. Stack Decisions

| Concern              | Choice                              | Why                                                                                              |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Frontend framework   | React 18 + Vite                     | Fast dev server, small build, ecosystem familiarity, easy Vitest/Playwright integration.         |
| Frontend language    | TypeScript                          | Catches contract drift between frontend and backend types.                                       |
| Backend runtime      | Node.js 22 + Express 4              | Minimal overhead for a CRUD service; Express is the simplest fit for the rubric.                 |
| Backend language     | TypeScript                          | Shared type vocabulary with the frontend (a small `shared/` package or duplicated DTO types).    |
| Database             | SQLite via `better-sqlite3`         | Zero-config, file-based, durable, perfect for single-user; mounted on Docker volume.             |
| Validation           | Zod                                 | One schema serves runtime validation and TS types; used on both ends.                            |
| Test runners         | Vitest (unit/integration), Playwright (E2E), axe-core (a11y) | Native ESM, fast, single config style across the stack.                       |
| Lint/format          | ESLint + Prettier                   | Standard guardrails.                                                                             |
| Containerization     | Docker multi-stage builds + Compose | Rubric requires it; multi-stage keeps images small.                                              |

## 3. High-Level Architecture

```
┌────────────────┐         HTTP/JSON         ┌──────────────────┐
│  React (Vite)  │ ───────────────────────►  │ Express API      │
│  - List view   │ ◄─────────────────────── │  /api/todos      │
│  - Form        │                            │  Zod validation  │
│  - State hook  │                            │  better-sqlite3  │
└────────────────┘                            └────────┬─────────┘
       served by nginx                                 │
       (prod stage)                                    ▼
                                                ┌──────────────┐
                                                │ /data/app.db │
                                                │ (volume)     │
                                                └──────────────┘
```

- **Frontend container** (`web`) — built static assets served by nginx. In dev, Vite dev server with HMR.
- **Backend container** (`api`) — Node process, exposes port 3001, owns the SQLite file at `/data/app.db`.
- **Volume** (`todo_data`) — persists the SQLite file across container restarts.

## 4. Repository Structure

```
todo-bmad/
├── apps/
│   ├── api/                    # Express + better-sqlite3 + Zod
│   │   ├── src/
│   │   │   ├── index.ts        # bootstrap
│   │   │   ├── app.ts          # express app factory (testable)
│   │   │   ├── db.ts           # better-sqlite3 connection + migrations
│   │   │   ├── routes/todos.ts # CRUD handlers
│   │   │   ├── schemas.ts      # Zod schemas + DTO types
│   │   │   └── errors.ts       # error middleware
│   │   ├── tests/              # Vitest integration tests
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                    # React + Vite
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── api/client.ts   # fetch wrapper
│       │   ├── components/
│       │   │   ├── TodoList.tsx
│       │   │   ├── TodoItem.tsx
│       │   │   ├── TodoForm.tsx
│       │   │   ├── EmptyState.tsx
│       │   │   └── ErrorBanner.tsx
│       │   ├── hooks/useTodos.ts
│       │   └── styles.css
│       ├── tests/              # Vitest + React Testing Library
│       ├── Dockerfile
│       ├── nginx.conf
│       ├── package.json
│       └── tsconfig.json
├── e2e/                        # Playwright tests against compose stack
│   ├── playwright.config.ts
│   └── tests/
├── docker-compose.yml
├── docker-compose.override.yml # dev profile
├── .env.example
├── README.md
└── _bmad-output/               # BMAD planning + implementation artifacts
```

This monorepo layout keeps web and api clearly separate while letting Playwright E2E live at the root, where it can spin up the full compose stack.

## 5. Data Model

### `todos` table

| Column      | Type                                   | Notes                                                                       |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------- |
| `id`        | TEXT PRIMARY KEY                       | UUID v4 generated server-side.                                              |
| `text`      | TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 500) | Trimmed at the API layer before insert.                          |
| `completed` | INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)) | SQLite has no boolean; 0/1.                                       |
| `created_at`| TEXT NOT NULL DEFAULT (datetime('now'))| ISO 8601 string in UTC.                                                     |
| `updated_at`| TEXT NOT NULL DEFAULT (datetime('now'))| Bumped on every UPDATE via trigger or explicitly in the handler.            |
| `owner_id`  | TEXT NULL                              | **Reserved for future auth (NFR-9).** Always NULL in v1; indexed for later. |

Index: `CREATE INDEX idx_todos_created_at ON todos(created_at DESC);`

## 6. API Contract

Base path: `/api`. All bodies are JSON. All errors use `{ "error": { "code": string, "message": string, "details"?: any } }`.

| Method | Path              | Purpose             | Request                                  | Success            |
| ------ | ----------------- | ------------------- | ---------------------------------------- | ------------------ |
| GET    | `/api/health`     | Liveness probe      | —                                        | `200 {"status":"ok"}` |
| GET    | `/api/todos`      | List all todos      | —                                        | `200 [Todo]`       |
| POST   | `/api/todos`      | Create todo         | `{ "text": string }` (1–500 after trim)  | `201 Todo`         |
| PATCH  | `/api/todos/:id`  | Update completed    | `{ "completed": boolean }` and/or `{ "text": string }` | `200 Todo`         |
| DELETE | `/api/todos/:id`  | Delete todo         | —                                        | `204` no body      |

### `Todo` shape

```ts
{
  id: string;          // uuid v4
  text: string;
  completed: boolean;
  createdAt: string;   // ISO 8601 UTC
  updatedAt: string;   // ISO 8601 UTC
}
```

### Error codes

| HTTP | code               | When                                                         |
| ---- | ------------------ | ------------------------------------------------------------ |
| 400  | `validation_error` | Zod validation fails (empty text, wrong type, length, etc.). |
| 404  | `not_found`        | PATCH/DELETE on unknown id.                                  |
| 500  | `internal_error`   | Unhandled exception (logged, generic message returned).      |

## 7. Frontend Architecture

- **State:** a single `useTodos` hook returns `{ todos, status, error, create, toggle, remove }`. Status is `'idle' | 'loading' | 'ready' | 'error'`. No global store needed.
- **Optimistic updates:** create/toggle/remove update local state immediately; on server error, revert and show `ErrorBanner`. (FR-11)
- **Components:** dumb, presentational where possible. Only `App.tsx` and `useTodos` know about the network.
- **Styling:** plain CSS modules or a tiny utility approach — no UI library, to keep bundle and a11y surface small.
- **Accessibility:** semantic elements (`<ul>`, `<button>`, `<form>`, label-input pairs), focus management on add, ARIA-live for error region.

## 8. Cross-Cutting Concerns

- **Error handling:** Express-level error middleware converts thrown errors / Zod failures to the standard error envelope. Frontend catches network failures and renders `ErrorBanner` without dropping list state.
- **Logging:** `pino` on the backend, one structured line per request (method, path, status, ms). Pretty-printed in dev, JSON in prod.
- **Configuration:** all env via `.env` files and `process.env`; `.env.example` lists every var. Variables: `PORT`, `DATABASE_PATH`, `CORS_ORIGIN`, `NODE_ENV`.
- **CORS:** locked to `CORS_ORIGIN` (e.g., `http://localhost:5173` in dev, `http://localhost:8080` for the compose web container).
- **Health:** `/api/health` returns 200 once DB is connected. `web` container has an HTTP healthcheck against nginx.

## 9. Future-Readiness

- `owner_id` reserved on `todos` (NFR-9). Adding auth later means: add a session/JWT middleware, populate `req.userId`, scope queries by `owner_id`, run a backfill migration. No breaking changes to the public DTO.
- API surface is the boundary; adding /auth or /users routes does not require touching todos handlers.

## 10. Test Strategy (overview, expanded in stories)

| Layer        | Tool             | What it covers                                                              |
| ------------ | ---------------- | --------------------------------------------------------------------------- |
| Backend unit | Vitest           | Zod schemas, DB layer (against in-memory SQLite), error mapping.            |
| Backend integration | Vitest + supertest | Each endpoint end-to-end against a fresh in-memory DB per test.   |
| Frontend unit| Vitest + RTL     | Components in isolation; the `useTodos` hook with a mocked fetch.           |
| E2E          | Playwright       | Full stack via docker-compose: create / complete / delete / empty / error.  |
| Accessibility| axe-core in Playwright | Run on the main page; assert zero critical/serious violations.        |

## 11. Validation

- All FRs (FR-1..FR-12) traceable to either an API endpoint or a UI component above.
- All NFRs addressed in §7–§10 (performance via optimistic UI, reliability via volume, security via Zod + CORS + parameterized queries, etc.).
- Open questions from the PRD are resolved or explicitly deferred.

## 12. Next Step

Hand off to SM persona to produce epics and stories (`epics-todo-bmad.md`).
