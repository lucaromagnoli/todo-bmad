---
stepsCompleted: [requirements_inventory, epic_breakdown, story_drafting]
inputDocuments:
  - _bmad-output/planning-artifacts/prd-todo-bmad.md
  - _bmad-output/planning-artifacts/architecture-todo-bmad.md
workflowType: epics-and-stories
status: draft
---

# todo-bmad — Epic Breakdown

## Overview

Decomposition of `prd-todo-bmad.md` and `architecture-todo-bmad.md` into 5 epics and 14 stories. Each story carries Gherkin acceptance criteria and the tests that must exist to call it done.

## Requirements Inventory

### Functional Requirements

FR-1 create todo · FR-2 list todos · FR-3 toggle complete · FR-4 delete · FR-5 persistence · FR-6 visual completed state · FR-7 empty state · FR-8 loading state · FR-9 error state · FR-10 createdAt · FR-11 optimistic updates · FR-12 input trim/reject empty.

### Non-Functional Requirements

NFR-1 perf · NFR-2 reliability · NFR-3 maintainability · NFR-4 testability · NFR-5 a11y · NFR-6 responsive · NFR-7 portability · NFR-8 security · NFR-9 future-ready data model · NFR-10 observability.

### FR / NFR Coverage Map

| Req     | Covered by story  |
| ------- | ----------------- |
| FR-1    | 2.2, 3.3, 4.1     |
| FR-2    | 2.1, 3.2, 4.1     |
| FR-3    | 2.3, 3.4, 4.2     |
| FR-4    | 2.4, 3.5, 4.3     |
| FR-5    | 2.5, 5.1          |
| FR-6    | 3.4               |
| FR-7    | 3.6, 4.4          |
| FR-8    | 3.2               |
| FR-9    | 2.6, 3.7, 4.5     |
| FR-10   | 2.1, 2.2          |
| FR-11   | 3.3, 3.4, 3.5     |
| FR-12   | 2.2, 3.3          |
| NFR-1   | 3.3 (optimistic)  |
| NFR-2   | 5.1, 5.2          |
| NFR-3   | 1.1               |
| NFR-4   | 1.1, 4.*, 6.1     |
| NFR-5   | 6.2               |
| NFR-6   | 3.* (responsive)  |
| NFR-7   | 5.1               |
| NFR-8   | 2.6, 6.3          |
| NFR-9   | 2.5               |
| NFR-10  | 2.7, 5.2          |

## Epic List

| Epic | Title                                  | Goal                                                                                    |
| ---- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| 1    | Project Setup & Test Infrastructure    | A monorepo bootstrap with linting, typechecking, Vitest, and Playwright wired up.       |
| 2    | Backend API & Persistence              | Express service with CRUD, Zod validation, SQLite persistence, structured errors/logs.  |
| 3    | Frontend UI & State                    | React app with list, form, toggle, delete, empty/loading/error states, optimistic UI.   |
| 4    | End-to-End Tests                       | ≥5 Playwright journeys against the full compose stack, covering happy paths and errors. |
| 5    | Containerization & Deployment          | Multi-stage Dockerfiles, healthchecks, `docker-compose up`, dev profile, env config.    |
| 6    | QA & Documentation                     | Coverage ≥70%, accessibility audit, security review, AI integration log, README.        |

---

## Epic 1: Project Setup & Test Infrastructure

Lay down the monorepo, shared tooling, and test runners so every later story can plug in tests immediately.

### Story 1.1: Monorepo bootstrap with web, api, e2e

As a developer,
I want a workspace with `apps/api`, `apps/web`, and `e2e` already configured (TS, ESLint, Prettier, Vitest, Playwright),
So that subsequent stories can add features and tests without bikeshedding tooling.

**Acceptance Criteria:**

**Given** a fresh clone
**When** I run `npm install` at the repo root
**Then** all three workspaces resolve their dependencies in one pass
**And** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` are all defined at the root and dispatch to the right workspace
**And** sample placeholder tests exist in each package and pass
**And** README documents the four commands.

**Tests:** sanity test in each package (`expect(true).toBe(true)`) — proves runners work.

---

## Epic 2: Backend API & Persistence

Build the Express service end to end: schema, persistence, validation, error envelope, logging, health.

### Story 2.1: GET /api/todos returns all todos

As the API,
I want to expose `GET /api/todos`,
So that the UI can render the list on load.

**AC:**
**Given** the database has todos
**When** a client calls `GET /api/todos`
**Then** the response is `200` with a JSON array of `Todo` objects sorted by `createdAt DESC`.
**And** each item has `id`, `text`, `completed`, `createdAt`, `updatedAt`.

**Tests:** Vitest integration with supertest against an in-memory DB seeded with 3 rows; assert order and shape.

### Story 2.2: POST /api/todos creates a todo

As the API,
I want to accept `POST /api/todos` with `{ text }`,
So that the user can add a task.

**AC:**
**Given** a valid body `{ "text": "buy milk" }`
**When** a client POSTs it
**Then** the response is `201` with the created `Todo` (`completed=false`, fresh UUID, `createdAt`/`updatedAt` set).
**And** subsequent `GET /api/todos` includes it.
**Given** a body with `text=""` or `text="   "` or `text` of 501+ chars or missing
**When** the client POSTs it
**Then** the response is `400` with `error.code === "validation_error"`.

**Tests:** Vitest integration covering happy path, whitespace-trim, empty, too-long, missing field, wrong type.

### Story 2.3: PATCH /api/todos/:id updates a todo

As the API,
I want to accept `PATCH /api/todos/:id` with partial body,
So that the user can toggle completed state (and optionally edit text — kept for future use).

**AC:**
**Given** an existing todo
**When** a client PATCHes `{ "completed": true }`
**Then** the response is `200` with the updated `Todo` and `updatedAt` advanced.
**Given** an unknown id
**Then** the response is `404` with `error.code === "not_found"`.

**Tests:** Vitest integration: happy toggle, toggle back, 404, validation failure on wrong type.

### Story 2.4: DELETE /api/todos/:id removes a todo

As the API,
I want to accept `DELETE /api/todos/:id`,
So that the user can remove tasks.

**AC:**
**Given** an existing todo
**When** the client DELETEs it
**Then** the response is `204` with no body
**And** the row is gone from the database.
**Given** an unknown id
**Then** the response is `404 not_found`.

**Tests:** Vitest integration: happy delete, second delete returns 404.

### Story 2.5: SQLite persistence layer with future-ready schema

As the system,
I want a `better-sqlite3` connection that creates the `todos` table on startup with the schema from architecture §5 (including a nullable `owner_id`),
So that data survives restarts and the model is ready for future auth.

**AC:**
**Given** the API container starts with `DATABASE_PATH=/data/app.db`
**When** the file does not exist
**Then** the table is created with all columns and the `idx_todos_created_at` index.
**Given** the file already exists with prior data
**When** the API restarts
**Then** existing rows are still readable and `owner_id` is NULL on all of them.

**Tests:** Vitest unit test against a temp file path; restart-the-connection test seeds → reopens → reads same rows.

### Story 2.6: Error envelope + global error middleware

As the API,
I want every error (validation, not-found, unhandled) routed through a single middleware that emits the `{ error: { code, message } }` envelope,
So that the frontend has one consistent error shape.

**AC:**
**Given** any request that triggers a Zod failure
**Then** the response is `400` with `error.code = "validation_error"` and `error.details` describing the failed fields.
**Given** any thrown `NotFoundError`
**Then** the response is `404` with `error.code = "not_found"`.
**Given** any unhandled exception
**Then** the response is `500` with `error.code = "internal_error"` and the original error is logged.

**Tests:** unit tests for the middleware mapping function; integration test that triggers each branch.

### Story 2.7: GET /api/health and request logging

As an operator,
I want `/api/health` to return 200 once the DB is reachable, and every request logged with method/path/status/ms,
So that compose healthchecks and debugging both work.

**AC:**
**Given** the server is up and the DB connection is open
**When** I `GET /api/health`
**Then** the response is `200 {"status":"ok"}`.
**And** the request appears in stdout as a structured log line.

**Tests:** integration test for the endpoint; log capture test confirming a structured line per request.

---

## Epic 3: Frontend UI & State

Build the React UI and `useTodos` hook with optimistic updates, empty/loading/error states, and accessible markup.

### Story 3.1: Vite app shell + API client

As a developer,
I want `apps/web` running with Vite, a typed `api/client.ts`, and an `App.tsx` skeleton,
So that subsequent components have a foundation.

**AC:**
**Given** `npm run dev` in `apps/web`
**When** the browser loads
**Then** the page renders the app title and points at `VITE_API_URL`.
**And** `api/client.ts` exposes typed functions: `listTodos`, `createTodo`, `updateTodo`, `deleteTodo`, each returning `Todo[]` / `Todo` / `void`.

**Tests:** Vitest unit tests for the client using `fetch` mocks (success + error responses).

### Story 3.2: Render the todo list with loading state (FR-2, FR-8)

As a user,
I want to see my todos as soon as the app loads, with a clear loading indicator while they fetch,
So that I never see an empty screen mistakenly.

**AC:**
**Given** the API returns 3 todos
**When** I open the app
**Then** I briefly see a loading state, then a list with 3 items.
**Given** the API call has not resolved
**Then** the loading state is visible.

**Tests:** RTL unit test: render with mocked client returning a delayed promise; assert loading then list.

### Story 3.3: Add a todo with optimistic update (FR-1, FR-11, FR-12)

As a user,
I want to type a todo, hit enter or click "Add", and see it instantly,
So that adding tasks feels snappy.

**AC:**
**Given** I type "walk the dog" and submit
**Then** it appears at the top of the list before the server responds.
**And** the input is cleared and re-focused.
**Given** the server returns 400 (e.g., empty after trim)
**Then** the optimistic item is rolled back and an error banner appears.
**Given** I submit empty or whitespace-only input
**Then** the form prevents submission with an inline message.

**Tests:** RTL unit tests: optimistic insert, rollback on error, whitespace rejection.

### Story 3.4: Toggle completed with visual distinction (FR-3, FR-6, FR-11)

As a user,
I want to toggle a todo by clicking its checkbox,
So that I can mark progress.

**AC:**
**Given** an active todo
**When** I click its checkbox
**Then** it is immediately styled as completed (strikethrough + muted color).
**And** the API receives PATCH `{completed:true}`.
**Given** the API fails
**Then** the visual state reverts and an error banner appears.

**Tests:** RTL unit tests on `TodoItem` covering both directions, optimistic and rollback paths.

### Story 3.5: Delete a todo (FR-4, FR-11)

As a user,
I want to delete a todo via a per-row delete button,
So that I can clean up my list.

**AC:**
**Given** a todo in the list
**When** I click delete
**Then** it disappears from the list immediately.
**And** the API receives DELETE.
**Given** the API fails
**Then** the item reappears and an error banner shows.

**Tests:** RTL unit tests for happy and rollback.

### Story 3.6: Empty state (FR-7)

As a user,
I want a friendly empty-state when I have no todos,
So that the UI is never blank or confusing.

**AC:**
**Given** the API returns `[]`
**Then** the list area renders "No todos yet — add your first one above" with appropriate semantics.

**Tests:** RTL unit test rendering with `[]`.

### Story 3.7: Error banner (FR-9)

As a user,
I want a non-blocking error banner when the network fails,
So that I understand the issue and don't lose what's on screen.

**AC:**
**Given** an API call rejects
**Then** an `ErrorBanner` with role `alert` appears with a human-readable message.
**Given** I dismiss the banner or trigger a successful action next
**Then** the banner disappears.

**Tests:** RTL unit tests for show/hide on error/success.

---

## Epic 4: End-to-End Tests

Validate full user journeys against the dockerized stack. Minimum 5 tests required by rubric — we plan 5+ here.

### Story 4.1: E2E — Create and see a todo

**AC:**
**Given** the compose stack is up
**When** I open the app, type "first task", and press enter
**Then** "first task" appears in the list within 1s.
**And** reloading the page still shows it.

### Story 4.2: E2E — Toggle a todo

**AC:**
**Given** at least one todo
**When** I click its checkbox
**Then** it shows the completed style
**And** reloading preserves the completed state.

### Story 4.3: E2E — Delete a todo

**AC:**
**Given** at least one todo
**When** I click delete
**Then** the row disappears
**And** reloading no longer shows it.

### Story 4.4: E2E — Empty state on first load

**AC:**
**Given** an empty database
**When** I open the app
**Then** the empty-state message is visible
**And** there are no list items.

### Story 4.5: E2E — Error state when API is unreachable

**AC:**
**Given** the api container is paused (or its origin blocked at the network layer)
**When** I attempt to add a todo
**Then** the error banner shows
**And** the optimistic item is rolled back.

---

## Epic 5: Containerization & Deployment

Make `docker-compose up` produce the working app on a clean machine.

### Story 5.1: Multi-stage Dockerfiles for api and web

As an operator,
I want small, secure images using multi-stage builds, non-root users, and HEALTHCHECK lines,
So that the rubric's Docker requirements are met.

**AC:**
**Given** `docker build` for both services
**Then** the final image runs as a non-root user, includes only production deps, has a HEALTHCHECK.
**And** image sizes are reasonable (api < 200 MB, web < 50 MB).

**Tests:** CI smoke (in this exercise, manual verification via `docker images` + `docker inspect`).

### Story 5.2: docker-compose.yml with volume, healthchecks, dev profile

As an operator,
I want a single `docker-compose.yml` (with `docker-compose.override.yml` for dev) that brings up `api` and `web` with a `todo_data` volume, healthchecks, and env vars from `.env`,
So that `docker-compose up` is the only command needed.

**AC:**
**Given** a fresh clone with `.env` copied from `.env.example`
**When** I run `docker-compose up --build`
**Then** both services become healthy and `http://localhost:8080` shows the app.
**And** `docker-compose down && docker-compose up` preserves the existing todos (volume).
**And** a `dev` profile (or override) runs the api with watch and the web with Vite dev server.

**Tests:** manual verification documented in QA report; Playwright E2E uses this stack as its target.

---

## Epic 6: QA & Documentation

Wrap up with the rubric's QA artifacts.

### Story 6.1: Coverage ≥70% with meaningful assertions

**AC:**
**Given** `npm run test:coverage`
**Then** combined backend + frontend coverage is ≥70% lines/statements/branches/functions.
**And** the coverage report is committed to `_bmad-output/implementation-artifacts/qa/coverage/`.

### Story 6.2: Accessibility audit — zero critical violations

**AC:**
**Given** Playwright + axe-core run against the running app
**Then** there are zero violations of impact "critical" or "serious".
**And** any minor findings are documented in the QA report.

### Story 6.3: Security review

**AC:**
**Given** `/security-review` (the Claude Code skill) runs against the branch
**Then** all findings are recorded, and any High/Critical items are fixed before delivery.
**And** the report is saved at `_bmad-output/implementation-artifacts/qa/security-review.md`.

### Story 6.4: README + AI integration log

**AC:**
**Given** the README at the repo root
**Then** it covers: project description, prerequisites, setup, dev workflow, test commands, `docker-compose up` instructions, troubleshooting, and a link to `_bmad-output/`.
**And** an `AI_LOG.md` documents agent usage, MCP usage, prompts that worked, what AI missed, and where human judgment was decisive.

---

## Sequencing & Dependencies

```
1.1 ──► 2.* ──► 3.* ──► 4.* ──► 5.* ──► 6.*
                ▲                  │
                └── 5.2 needed for 4.5 (compose-based E2E)
```

Stories in epics 2 and 3 can proceed in parallel after 1.1 lands. Story 4.* depends on 5.2 because the E2E suite targets the compose stack. Epic 6 wraps once everything else is green.
