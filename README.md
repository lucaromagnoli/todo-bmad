# todo-bmad

A single-user Todo web app built using the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) workflow as a training exercise.

## Status

In active development. See `_bmad-output/planning-artifacts/` for the BMAD planning artifacts (project brief, PRD, architecture, epics & stories).

## Repository layout

```
apps/
  api/    Express + better-sqlite3 + Zod backend (Epic 2)
  web/    React + Vite frontend (Epic 3)
e2e/      Playwright end-to-end tests (Epic 4)
docs/     Source PRD and supporting docs
_bmad-output/
  planning-artifacts/    Brief, PRD, architecture, epics & stories
  implementation-artifacts/  QA reports, AI integration log (later)
```

## Prerequisites

- Node.js ≥ 22 (see `.nvmrc`)
- npm ≥ 10
- Docker + Docker Compose (for the dockerized stack — Epic 5)

## Getting started

```bash
nvm use            # picks up the version in .nvmrc
npm install        # installs all workspaces
cp .env.example .env
```

## Common commands

| Command                       | What it does                                         |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | Run dev servers in every workspace that defines one. |
| `npm run build`               | Build every workspace.                               |
| `npm run lint`                | ESLint over the whole repo.                          |
| `npm run typecheck`           | TypeScript `--noEmit` per workspace.                 |
| `npm run test`                | Vitest unit + integration tests (api + web).         |
| `npm run test:coverage`       | Same with coverage reports.                          |
| `npm run test:e2e`            | Playwright E2E suite (requires browsers — see below).|
| `npm run test:e2e:install`    | Install Playwright's chromium binary one-off.        |
| `npm run format`              | Prettier write.                                      |

## Documentation map

- **PRD (input):** `docs/prd-input.md`
- **Refined PRD:** `_bmad-output/planning-artifacts/prd-todo-bmad.md`
- **Architecture:** `_bmad-output/planning-artifacts/architecture-todo-bmad.md`
- **Stories:** `_bmad-output/planning-artifacts/epics-todo-bmad.md`
