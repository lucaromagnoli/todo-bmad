# todo-bmad

A small, single-user Todo web application built end-to-end using the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) agentic workflow as a training exercise. Frontend is React + Vite, backend is Node + Express + SQLite, the whole stack runs via `docker compose up`.

The interesting thing about this repository isn't the app itself — it's the trail of artifacts (project brief → PRD → architecture → stories → code → tests → Docker → QA reports) showing how the BMAD personas drove every decision. See `_bmad-output/` for the planning artifacts and `AI_LOG.md` for the integration log.

## Status

| Layer            | Result                                                       |
| ---------------- | ------------------------------------------------------------ |
| Backend tests    | 31 passing (Vitest + supertest)                              |
| Frontend tests   | 32 passing (Vitest + React Testing Library)                  |
| E2E tests        | 5 passing (Playwright against compose stack)                 |
| Accessibility    | 3 axe-core specs, **zero** WCAG 2.0/2.1 A+AA violations      |
| Coverage         | api 91.66% / web 98.44% statements (target ≥70%)             |
| Security audit   | `npm audit --omit=dev` clean, OWASP Top 10 walkthrough done |
| Docker           | `docker compose up` brings up healthy api + web              |
| Persistence      | SQLite on a named volume; survives `down/up`                 |

## Repository layout

```
apps/
  api/           Express + better-sqlite3 + Zod + pino  (Epic 2)
  web/           React + Vite + axe-friendly UI         (Epic 3)
e2e/             Playwright + axe-core                   (Epics 4, 6)
docs/            Source PRD provided to the PM persona
_bmad-output/
  planning-artifacts/        brief, PRD, architecture, epics+stories
  implementation-artifacts/  QA reports (coverage, a11y, security)
docker-compose.yml          Production stack
docker-compose.dev.yml      Optional HMR/watch overlay
```

## Prerequisites

- Node.js ≥ 22 (see `.nvmrc`)
- npm ≥ 10
- Docker + Docker Compose v2 (for the dockerized stack and the E2E suite)

## Quick start (dockerized — recommended)

```bash
docker compose up -d --build           # build + start api + web
open http://localhost:8080             # use the app
docker compose logs -f                 # tail logs
docker compose down                    # stop (data persists in the volume)
docker compose down -v                 # stop + drop the SQLite volume
```

The web service serves the SPA on `:8080` and reverse-proxies `/api/` to the api service over the compose network. Both services have HTTP healthchecks (`docker compose ps` shows `(healthy)`).

## Local development (no Docker)

```bash
nvm use                                # picks up Node 22 from .nvmrc
npm install                            # install all workspaces
cp .env.example .env                   # not strictly required but documents the vars
npm run dev                            # api on :3001, vite on :5173
```

The Vite dev server proxies nothing — `apps/web/src/api/client.ts` reads `VITE_API_URL` (default `http://localhost:3001`), so the SPA hits the api directly.

## Common commands

| Command                                              | Effect                                                         |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                                        | Run dev servers in every workspace.                            |
| `npm run build`                                      | Build every workspace.                                         |
| `npm run lint`                                       | ESLint over the whole repo.                                    |
| `npm run typecheck`                                  | `tsc --noEmit` per workspace.                                  |
| `npm test`                                           | All unit + integration tests (api + web).                      |
| `npm run test:coverage`                              | Same with coverage reports → `apps/*/coverage/`.               |
| `npm run test:e2e:install`                           | One-off: `playwright install --with-deps chromium`.            |
| `npm run test:e2e`                                   | Run the Playwright suite. Requires the compose stack running.  |
| `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` | HMR + watch development inside containers.       |

## Running the E2E suite

```bash
docker compose up -d --build
npm run test:e2e:install               # first time only
npm run test:e2e                       # 8 specs (5 user journeys + 3 a11y)
```

`e2e/global-setup.ts` waits for `/healthz` and `/api/health` to return 200 with a clear error pointing back at `docker compose up` if not.

## Environment variables

| Var              | Default                  | Used by              | Notes                                              |
| ---------------- | ------------------------ | -------------------- | -------------------------------------------------- |
| `PORT`           | `3001`                   | api                  | Port the api listens on inside the container.      |
| `DATABASE_PATH`  | `/data/app.db`           | api                  | SQLite file (volume-mounted in compose).           |
| `CORS_ORIGIN`    | `http://localhost:8080`  | api                  | Single origin allowed; no wildcard.                |
| `LOG_LEVEL`      | `info` (prod) / `debug`  | api                  | Pino log level.                                    |
| `WEB_PORT`       | `8080`                   | docker-compose       | Host port mapped to nginx.                         |
| `VITE_API_URL`   | `http://localhost:3001`  | web (dev)            | Empty in the prod build so paths are same-origin.  |
| `E2E_BASE_URL`   | `http://localhost:8080`  | playwright           | Override to point at a different stack.            |

## Documentation map

- **Source PRD (input):** `docs/prd-input.md`
- **Refined PRD:** `_bmad-output/planning-artifacts/prd-todo-bmad.md`
- **Project brief:** `_bmad-output/planning-artifacts/product-brief-todo-bmad.md`
- **Architecture:** `_bmad-output/planning-artifacts/architecture-todo-bmad.md`
- **Epics & stories:** `_bmad-output/planning-artifacts/epics-todo-bmad.md`
- **Coverage report:** `_bmad-output/implementation-artifacts/qa/coverage/`
- **Accessibility report:** `_bmad-output/implementation-artifacts/qa/a11y/`
- **Security review:** `_bmad-output/implementation-artifacts/qa/security-review.md`
- **AI integration log:** `AI_LOG.md`

## Troubleshooting

| Symptom                                              | Likely cause / fix                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `docker compose up` hangs on api healthcheck         | Native `better-sqlite3` failed to install. Make sure you're on Docker Desktop ≥ 24 and try again. |
| Browser shows "Could not reach the server."          | The api container isn't healthy. `docker compose logs api`. CORS_ORIGIN may not match.            |
| `npm run test:e2e` errors "Timed out waiting for /healthz" | The compose stack isn't up. Run `docker compose up -d --build` first.                       |
| Tests pass locally, fail in CI                       | Browsers not installed: `npm run test:e2e:install`. Or compose isn't up in the CI job.            |
| `docker compose down -v` accidentally dropped todos  | Yep — the `-v` flag drops the named `todo_bmad_data` volume. There's no recovery; use `down` next time. |

## Why BMAD?

The framework's value here was structural, not generative. The four planning artifacts (brief, PRD, architecture, epics) reach back to the same source PRD and forward to the code, so when a question comes up — _"why this CHECK constraint? why nullable owner_id? why optimistic UI?"_ — the answer is always one document away. The split between PM (what), Architect (how), and Story Master (smallest deployable units with acceptance criteria) gave each commit a clear scope, which is what makes the git log readable as a story.

See `AI_LOG.md` for the full integration log: which BMAD skills were invoked, what worked, what AI missed, where human judgment was the unblocking factor.
