---
stepsCompleted: [discovery, vision, success, journeys, scoping, functional, nonfunctional]
inputDocuments:
  - docs/prd-input.md
  - _bmad-output/planning-artifacts/product-brief-todo-bmad.md
workflowType: prd
status: draft
---

# Product Requirements Document — todo-bmad

**Author:** Luca Romagnoli
**Date:** 2026-04-27
**Version:** 0.1 (draft for review)

## 1. Vision

A single-user Todo application that does the obvious thing perfectly. The user opens it, sees their list, and manages tasks (create, complete, delete) without instruction. Everything is durable, fast, and works on phone or desktop.

## 2. Goals

- Deliver core CRUD on personal todos with zero onboarding friction.
- Persist state durably across sessions, refreshes, and container restarts.
- Ship a complete, deployable, tested product (frontend + backend + Docker) suitable as a foundation for future features.

## 3. Non-Goals (out of scope for v1)

- User accounts, authentication, multi-user, collaboration.
- Task priorities, due dates, reminders, notifications.
- Tags, search, filtering beyond active/completed.
- Native mobile apps; offline-first behavior.
- Cloud deployment beyond local `docker-compose`.

## 4. Personas

- **The Owner (only persona):** an individual managing their own short list of personal tasks on a single browser. Expects the app to behave like a piece of paper — write, cross out, throw away.

## 5. User Journeys

1. **First visit:** user opens the app. Sees an empty-state message ("No todos yet — add your first one"). Adds a todo. Sees it appear at the top of the list.
2. **Daily use:** user opens the app, sees existing list. Toggles a task complete (visually distinct). Deletes a task. State persists on refresh.
3. **Failure path:** backend is unreachable; user sees a clear error message and the UI does not corrupt local state. When the backend recovers, the next action succeeds.

## 6. Functional Requirements

| ID    | Requirement                                                                                                         | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | The system shall allow the user to create a todo by submitting a non-empty text description (1–500 chars).          | Must     |
| FR-2  | The system shall list all todos in reverse-chronological order of creation.                                         | Must     |
| FR-3  | The system shall allow the user to mark a todo as completed and to revert it to active.                             | Must     |
| FR-4  | The system shall allow the user to permanently delete a todo.                                                       | Must     |
| FR-5  | The system shall persist todos in durable storage so that state survives page refresh, server restart, and redeploy.| Must     |
| FR-6  | The system shall visually distinguish completed todos from active ones (e.g., strikethrough + muted color).         | Must     |
| FR-7  | The system shall display an empty-state message when no todos exist.                                                | Must     |
| FR-8  | The system shall display a loading indicator while the initial todo list is being fetched.                          | Must     |
| FR-9  | The system shall display a user-readable error message when an API call fails, without losing other UI state.       | Must     |
| FR-10 | Each todo shall include a creation timestamp persisted on the server.                                               | Must     |
| FR-11 | The UI shall apply optimistic updates for create/toggle/delete and reconcile on server response.                    | Should   |
| FR-12 | The system shall trim leading/trailing whitespace and reject empty/whitespace-only todo text.                       | Must     |

## 7. Non-Functional Requirements

| ID     | Requirement                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------- |
| NFR-1  | **Performance.** Perceived UI response ≤100 ms for create/toggle/delete on local stack.                            |
| NFR-2  | **Reliability.** No data loss on container restart; SQLite file mounted on a Docker volume.                        |
| NFR-3  | **Maintainability.** Codebase under ~1.5k LOC; clear separation of frontend, backend, and tests.                   |
| NFR-4  | **Testability.** ≥70% meaningful coverage on backend + frontend logic; ≥5 Playwright E2E tests.                    |
| NFR-5  | **Accessibility.** Zero critical WCAG AA violations from axe-core / Lighthouse.                                    |
| NFR-6  | **Responsive.** Layout works at 320 px width and up (mobile-first).                                                |
| NFR-7  | **Portability.** Single-command bring-up via `docker-compose up`; runs on macOS / Linux / Windows.                 |
| NFR-8  | **Security.** Input validation on every endpoint; parameterized SQL; no secrets in repo; CORS limited to UI origin.|
| NFR-9  | **Future-readiness.** Data model includes a nullable `owner_id` field reserved for future auth — unused in v1.     |
| NFR-10 | **Observability.** Backend logs structured request/response info; container exposes a `/health` endpoint.          |

## 8. Success Metrics

- A first-time user completes create / complete / delete with zero instruction (usability test on one external user, recorded in QA report).
- All FRs covered by automated tests; rubric thresholds (coverage, E2E, WCAG) met.
- `docker-compose up` produces a working app on a fresh clone in under 2 minutes.

## 9. Open Questions / Assumptions

- **Assumed:** SQLite is acceptable; no Postgres needed. (Confirmed during scoping.)
- **Assumed:** No deployment beyond local Docker Compose for grading.
- **Open:** Should we keep an "archived" state separate from "deleted"? — **Decision:** No, delete is permanent in v1.

## 10. Next Step

Hand off to Architect persona to produce `architecture-todo-bmad.md`.
