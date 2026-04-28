# Security Review — todo-bmad

**Date:** 2026-04-28
**Reviewer:** code review against OWASP Top 10 (2021) for the slice that applies to a single-user CRUD app.
**Status:** ✅ no High/Critical findings. One Moderate (vulnerable transitive dep) was fixed during this review.

## Scope

Application boundaries:
- `apps/api` — Express service exposing `/api/health` and `/api/todos`.
- `apps/web` — React SPA served by nginx; reverse-proxies `/api/` to the api service.
- `docker-compose.yml` — orchestration; SQLite file in a named volume.

Out of scope: anything related to auth, multi-user, secrets management at scale — those are explicitly deferred per PRD §3.

## Findings

### F-1 — uuid <14.0.0: missing buffer bounds check ✅ FIXED

| | |
| - | - |
| **Severity** | Moderate (CVSS 6.5) — [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| **Where** | `apps/api` previously depended on `uuid@^11.0.2`. |
| **Exposure (this app)** | None in practice. The advisory targets `v3/v5/v6` generators when a `buf` argument is passed; we only call `v4()` with no arguments. The advisory was therefore not exploitable in our code. |
| **Action taken** | Upgraded to `uuid@^14.0.0` anyway so `npm audit` is clean. All 31 api tests still pass. `npm audit --omit=dev` now reports zero vulnerabilities. |

### F-2 — Dev-only vulnerable transitives (informational)

`npm audit` (full tree) reports 6 remaining Moderate findings, all in **dev-only** dependencies (Vitest's coverage reporter, etc.). These do not ship to production images. We're not patching them because:

- They're transitive deps of test tooling (no direct upgrade path).
- The Dockerfile's `prod-deps` stage uses `--omit=dev`, so the runtime images do not contain these packages — confirmed by inspecting the api image (final size 312 MB without dev tree).

We will revisit when the upstream packages publish fixes.

## OWASP Top 10 walkthrough

### A01 Broken Access Control — N/A (single-user, no auth)

There is no concept of "another user's data" in v1. The data model reserves a nullable `owner_id` column for future auth (architecture §5 / NFR-9). When auth is added, every `routes/todos.ts` query must scope by `req.userId`; until then there is no access boundary to break.

### A02 Cryptographic Failures — N/A

No secrets, tokens, passwords, or sensitive data are stored or transmitted. The DB file holds plain text todos by design.

### A03 Injection — ✅

- **SQL:** every query uses prepared statements via `better-sqlite3` (`db.prepare(...)`). Parameters are never string-interpolated. The only dynamic SQL is the PATCH update (`apps/api/src/routes/todos.ts:51`) which builds a comma-separated SET list — but the column names are *fixed strings from the source* (`text = ?`, `completed = ?`, `updated_at = strftime(...)`), and only the *values* are bound parameters. No user-controlled identifier ever reaches the SQL string.
- **OS / shell:** none — the api never invokes `child_process` or shells out.
- **NoSQL / template:** none — no Mongo, no template engines.

### A04 Insecure Design — ✅ for scope

Threat-model decisions documented in `prd-todo-bmad.md` (§3 out-of-scope) and `architecture-todo-bmad.md` (§9 future-readiness). The data model intentionally leaves room for `owner_id` so adding auth later is a localized change, not a redesign.

### A05 Security Misconfiguration — ✅

- **CORS** locked to a single origin via the `CORS_ORIGIN` env var; defaults to the compose web origin. No wildcard.
- **Server tokens** disabled in nginx (`server_tokens off`).
- **Body size cap** on JSON parsing (`express.json({ limit: '64kb' })`) prevents trivial memory abuse.
- **Containers** run as non-root users (api → `app`, web → `app`) with no shell.
- **Volumes** are named (`todo_bmad_data`), so accidental `docker compose down -v` is the only way to drop state.
- **Restart policy** `unless-stopped` keeps the api up across host reboots.

### A06 Vulnerable & Outdated Components — ✅ (after F-1 fix)

`npm audit --omit=dev` reports zero vulnerabilities. Dev-only findings tracked in F-2.

### A07 ID & Authentication Failures — N/A (no auth in v1)

### A08 Software & Data Integrity Failures — ✅

- `package-lock.json` committed; CI installs are deterministic via `npm ci`.
- Dockerfiles pin specific base tags (`node:22-alpine`, `nginx:1.27-alpine`).
- No fetched-at-build remote scripts (no `curl | bash`).

### A09 Logging & Monitoring — ✅ for scope

- `pino-http` emits one structured JSON log line per request (method, path, status, ms).
- 5xx errors are logged with the original `err` object via the global error middleware.
- No PII is logged (todos are user-controlled text but the rubric flags this app as single-user, not multi-user).

### A10 SSRF — N/A

The api never fetches arbitrary URLs.

## Frontend-specific (XSS)

- React escapes interpolated text by default. We never use `dangerouslySetInnerHTML` (verified by grep over `apps/web/src`).
- The aria-labels on per-row buttons interpolate `todo.text` into a JS template string before React renders it as a plain attribute value — XSS safe (no `eval`, no `innerHTML`).
- No third-party script tags in `index.html` or `nginx.conf`.

## Inputs validated at the boundary

| Field           | Rule                                           | Where                          |
| --------------- | ---------------------------------------------- | ------------------------------ |
| `text` (POST)   | string, trim, 1..500 chars                     | `apps/api/src/schemas.ts`      |
| `text` (PATCH)  | optional, trim, 1..500 chars                   | `apps/api/src/schemas.ts`      |
| `completed`     | optional boolean                               | `apps/api/src/schemas.ts`      |
| body            | at least one of `text` / `completed`           | `apps/api/src/schemas.ts`      |
| `:id` param     | non-empty string (UUID v4 from `uuidv4()`)     | `apps/api/src/schemas.ts`      |

DB layer also enforces `text` length and `completed ∈ {0,1}` via CHECK constraints (defense in depth), tested in `apps/api/tests/db.test.ts`.

## Risks accepted (deferred to future iterations)

- **No auth.** Anyone with network access to the api can mutate the single todo list. The threat model is "single user on their own machine running compose locally", per the PRD.
- **Rate limiting.** None. A spammer could fill the SQLite file. Not in scope for v1; would land alongside auth.
- **CSRF.** With cookie-based session auth this would matter; we have no auth, so no token to forge.

## Verification

```bash
npm audit --omit=dev    # zero vulnerabilities
npm test                # 63 unit/integration tests
npm run test:e2e        # 5 user-journey + 3 a11y E2E tests
```
