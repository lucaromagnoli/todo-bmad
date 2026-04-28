# AI Integration Log — todo-bmad

This log documents how AI assistance shaped the build. It's deliberately honest about what worked, what didn't, and where I had to step in. The goal is to make it possible to redo the project with similar tooling and avoid the same dead ends.

## Tooling

- **Coding assistant:** Claude Code (CLI) running Claude Opus 4.7 (1M context).
- **Workflow framework:** BMAD-METHOD `bmm` module installed via `npx bmad-method install --modules bmm --tools claude-code`. The installer drops 44 `bmad-*` skills into `.claude/skills/` plus `_bmad/` config — none of them auto-trigger; they are manual references the assistant reads when producing planning artifacts.
- **MCP servers used in this session:** none. (None were configured at the time.) The Playwright suite calls Playwright's own CLI directly, not via an MCP integration. Same for Chrome DevTools.
- **Stack the AI agreed to:** React 18 + Vite, Node 22 + Express 4, SQLite via `better-sqlite3`, Zod for validation, Pino for logging, Playwright + axe-core for E2E, Vitest + RTL for unit/integration. All my call after a prefilled question; the AI proposed reasonable defaults including a Postgres alternative I declined.

## Phase-by-phase

### Phase 1 — BMAD planning artifacts

What worked:
- Feeding the source PRD verbatim and asking the assistant to act as the PM persona produced a structured PRD (12 FRs, 10 NFRs, journeys, scope) in one pass. The numbered FR/NFR scheme paid off later when the SM persona produced a coverage map proving every requirement was traced to a story.
- The Architect output was usefully opinionated: it pre-decided the `owner_id` column should be nullable and reserved (NFR-9) so a future auth layer wouldn't require a schema rewrite. That single line shaped the data model for the whole build.
- Epics & stories with Gherkin acceptance criteria were a strong scaffolding tool. Each later commit could quote the AC it satisfied.

What I had to push on:
- Initial scope creep: the AI proposed extra features ("archived state separate from delete?") that I rejected to stay aligned with the PRD's deliberate minimalism. **Lesson:** the AI defaults toward more, not less. Be explicit about non-goals.
- The AI wanted to interactively run the BMAD `bmad-product-brief` skill (which has a 5-stage discovery flow). For a well-defined PRD, that's churn — I had it produce the artifacts directly using the BMAD format conventions instead. **Lesson:** the BMAD skills are designed for greenfield brainstorming; with a clear input PRD, skip the elicitation flow.

Effective prompts:
- "Produce the artifacts following BMAD format and conventions" + concrete inputs (the PRD + stack decisions) is faster than running the interactive skills.
- Asking for the FR/NFR coverage map as part of the epics doc — without that, traceability was implicit.

### Phase 2 — Backend (Epic 2)

What worked:
- Test-first cadence per story: the AI wrote integration tests via supertest against an in-memory SQLite for every endpoint. Caught the validation matrix completely (empty/whitespace/too-long/missing/wrong-type rejections) without me having to enumerate cases.
- The error envelope (`{ error: { code, message, details? } }`) was applied consistently because we built it as story 2.6 *before* the CRUD handlers and reused it.
- Pino structured logging dropped in cleanly. The logging test pipes pino through a custom `Writable` to assert one structured line per request — clean pattern.

What didn't work first time:
- The first `npm run typecheck` failed: NodeNext requires explicit `.js` extensions on relative imports inside TS source. The AI knew the rule when challenged but didn't apply it preemptively.
- `npm run lint` failed initially because globals like `Response` and `RequestInit` weren't in the eslint config. I had to add them. **Lesson:** flat eslint config doesn't auto-include browser globals; you have to declare them.

### Phase 3 — Frontend (Epic 3)

What worked:
- The `useTodos` hook with optimistic updates and rollback was specified in story 3.3 and the AI implemented all three mutations (create, toggle, remove) with the same shape — clean.
- React Testing Library tests landed correctly with `userEvent` setup-and-tear-down, role-based queries, and `aria-label` matchers. The components were a11y-friendly mostly because the test queries forced labelled markup.

The single biggest bug — caught only by tests:
- The first version of `useTodos` captured `prevSnapshot` *inside* the `setTodos` updater. That's stale because React schedules updaters; by the time `prevSnapshot.find(id)` ran, the closure was empty. Three of ten hook tests failed. The fix was a `useRef` mirroring `todos` so the closure has a current value at call time. **Lesson:** read state via a ref when you need the value synchronously inside an async callback. The test failure made the bug obvious; without it I might have shipped the race.

### Phase 4 — Docker (Epic 5)

What worked:
- Multi-stage Dockerfiles came together quickly. The AI suggested separate `deps`, `build`, `prod-deps`, `runtime` stages so the final layer has only prod modules.
- The `!reset null` trick in `docker-compose.dev.yml` to wipe inherited fields (build, healthcheck, depends_on) when overlaying — that's a Compose feature I'd not used before and the AI surfaced it.

What didn't work first time:
- Initial Dockerfile copied `apps/api/node_modules/` from a prod-deps stage. npm workspaces hoist deps to root `node_modules/`, so the workspace-local directory doesn't exist. Build failed with a clear error; fix was a one-line removal.
- API image came in at 429 MB on `bookworm-slim`. Switched to `node:22-alpine` and added `python3 make g++` for native module builds → 312 MB. Still bigger than the 200 MB story aspiration but acceptable for a node app with `better-sqlite3`.

### Bugs the unit tests missed, caught during integration testing

These two are highlighted because they're the most instructive part of this log:

1. **Timestamps were `2026-04-28 13:00:52`** (SQLite's `datetime('now')`) rather than ISO 8601 UTC as the architecture specified. Unit tests asserted equality on returned timestamps but never checked the format. Smoke-testing the api container with a `curl` made the wrong format glaringly visible. Fix: switch to `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`. **Lesson:** add a regex format assertion when you care about a wire format, not just round-trip equality.

2. **Prod bundle called `/api/api/todos`.** The Vite build had `VITE_API_URL=/api`, the client appended `/api/todos`, → `/api/api/todos` which nginx didn't route. All five Playwright E2E tests failed identically. Fix: empty `VITE_API_URL` so paths are same-origin. **Lesson:** do at least one full integration test per environment before declaring victory; unit tests can't catch wiring mistakes between layers.

### Phase 5 — E2E (Epic 4)

What worked:
- `globalSetup` that just *waits* for `/healthz` and `/api/health` (with a helpful "did you `docker compose up`?" message) is more honest than auto-orchestrating containers from the test runner. The error path also doubles as documentation.
- Resetting state via `beforeEach` (list → delete each) is fast and avoids test isolation issues.
- Story 4.5 (api unreachable) using `page.route('**/api/todos', route => route.abort('connectionrefused'))` is faster and more deterministic than actually pausing the api container. Worth knowing about.

### Phase 6 — QA & docs (Epic 6)

What worked:
- Coverage was already in good shape because tests landed alongside each story. The AI's coverage report was meaningful (per-file table, rationale for the few uncovered lines) rather than "we hit 90, ship it".
- The accessibility audit found *zero* violations — partly because the components used semantic elements from day one (the test queries push you that way), partly because `role="alert"`/`aria-label`/`aria-invalid` were applied as the components were written, not retrofitted.
- The OWASP Top 10 walkthrough caught a real moderate vuln (`uuid <14.0.0`) and produced a confident "not exploitable here, upgrading anyway" verdict supported by reading the advisory and our usage. AI was good at this kind of structured cross-reference.

## Limitations encountered

- **AI didn't preemptively run lint/typecheck.** Several commits would have caught issues (NodeNext `.js` extensions, missing eslint globals, `import.meta.env` types) one cycle earlier if the assistant had run the verification triple before declaring a story done. I had to ask. This is a workflow fix, not a model limitation: the workflow should always be `write → typecheck → lint → test → commit`.
- **AI underestimated bundle wiring across environments.** The prod URL bug (`/api/api/todos`) is exactly the kind of thing a model can't catch from code alone — it requires running the system. Treat "compiles + tests" as necessary but not sufficient.
- **AI defaulted to over-engineering.** Without explicit pushback I'd have ended up with a Postgres service, a redux store, an additional shared package, and an `archived` todo state. **Mitigation:** explicit "non-goals" in the PRD and a habit of asking "is this needed for the AC?" before accepting a suggestion.
- **AI was too eager to add comments and try/catch around things that don't fail.** Pruning these as they appeared kept the codebase under 1.5k LOC.
- **Compose profile semantics are awkward** for the dev/prod overlay use case; the AI initially proposed gating prod services behind a profile, which would have made `docker compose up` start nothing. We landed on a separate `docker-compose.dev.yml` overlay file, which is plainer and clearer.

## Where human judgment was the unblocking factor

- **Choosing what NOT to build.** The PRD's deliberate minimalism is the entire point of the project — keeping the AI from drifting toward "well, while we're here..." features required active judgment.
- **Rejecting interactive skill flows when the input was already clear.** The BMAD interactive PM/Architect/SM skills are valuable for greenfield ideation; for a tight PRD, running them in full would have been ceremony.
- **Insisting on per-story commits.** The AI was happy to bundle larger changes; small commits with the FR/NFR they satisfied made the history reviewable in retrospect.
- **Smoke-testing in real environments.** The two integration bugs above (timestamp format and URL prefix) only surfaced because I ran the compose stack and curl'd it before declaring done.

## What I'd do differently next time

1. **Write a verification script earlier** that does `npm run lint && npm run typecheck && npm test && docker compose up -d && curl /api/health` and gate every commit on it. The AI will then stop forgetting to lint.
2. **Use Compose profiles instead of an overlay file** — but only after I've thought about the prod-default vs. dev-default story up front.
3. **Add a regex/contract test for every wire format.** The timestamp bug would have been caught at test time, not smoke-test time.

## Counts

| Activity                              | Count |
| ------------------------------------- | ----- |
| BMAD personas exercised               | 3 (PM, Architect, SM) |
| BMAD skills installed                 | 44 (.claude/skills/bmad-*) |
| Commits on `main`                     | ~17   |
| Stories completed                     | 23 / 23 |
| Tests at completion                   | 31 + 32 + 5 + 3 = **71** |
| AI-introduced bugs caught by tests    | 1 (stale `prevSnapshot` closure) |
| AI-introduced bugs caught by smoke    | 2 (timestamp format, URL prefix) |
| Production deps with vulnerabilities  | 0 (after `uuid` upgrade)        |
