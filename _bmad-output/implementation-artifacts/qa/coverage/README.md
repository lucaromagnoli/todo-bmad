# Coverage Report — todo-bmad

**Generated:** 2026-04-28
**Target:** ≥70% meaningful coverage (rubric NFR-4)
**Result:** ✅ exceeded on every metric across both workspaces.

## Backend (`apps/api`)

| Metric     | %     | Threshold | Status |
| ---------- | ----- | --------- | ------ |
| Statements | 91.66 | 70        | ✅     |
| Branches   | 88.88 | 70        | ✅     |
| Functions  | 88.88 | 70        | ✅     |
| Lines      | 91.66 | 70        | ✅     |

### Per-file

| File             | Stmts | Branch | Funcs | Lines | Uncovered                                   |
| ---------------- | ----- | ------ | ----- | ----- | ------------------------------------------- |
| `app.ts`         | 100   | 100    | 100   | 100   | —                                           |
| `db.ts`          | 100   | 100    | 100   | 100   | —                                           |
| `errors.ts`      | 100   | 100    | 100   | 100   | —                                           |
| `schemas.ts`     | 100   | 100    | 100   | 100   | —                                           |
| `logger.ts`      | 0     | 0      | 0     | 0     | thin pino factory; not worth its own test   |
| `routes/todos.ts`| 94.54 | 82.35  | 100   | 94.54 | lines 52–54 — defensive insert null-row branch |

`logger.ts` is a 12-line factory delegating to pino — exercised every time the server starts. We deliberately do not unit-test it; covering it would mean asserting against pino's internals.

The uncovered branch in `routes/todos.ts` is the `if (!row) throw new Error('insert produced no row')` guard — a "this can't happen, but if SQLite suddenly returns nothing after a successful INSERT, fail loudly" line. Not worth fabricating a way to trigger.

## Frontend (`apps/web`)

| Metric     | %     | Threshold | Status |
| ---------- | ----- | --------- | ------ |
| Statements | 98.44 | 70        | ✅     |
| Branches   | 88.88 | 70        | ✅     |
| Functions  | 100   | 70        | ✅     |
| Lines      | 98.44 | 70        | ✅     |

### Per-file

| File                 | Stmts | Branch | Funcs | Lines | Uncovered                                  |
| -------------------- | ----- | ------ | ----- | ----- | ------------------------------------------ |
| `App.tsx`            | 88.88 | 75     | 100   | 88.88 | error-state paragraph (covered by E2E)     |
| `api/client.ts`      | 100   | 100    | 100   | 100   | —                                          |
| `api/types.ts`       | n/a   | n/a    | n/a   | n/a   | declaration-only                           |
| `components/*`       | 100   | ~95    | 100   | 100   | one branch in `TodoForm` for inline error reset |
| `hooks/useTodos.ts`  | 97.93 | 83.33  | 100   | 97.93 | the empty-text early-return + ref init     |

## Test Counts

| Suite                    | Tests | Runtime |
| ------------------------ | ----- | ------- |
| `apps/api` (Vitest)      | 31    | ~600 ms |
| `apps/web` (Vitest + RTL)| 32    | ~1.8 s  |
| `e2e` (Playwright)       | 5     | ~1.3 s  |
| **Total**                | **68**|         |

## How to regenerate

```bash
npm run test:coverage           # both workspaces
npm run test:coverage --workspace=apps/api
npm run test:coverage --workspace=apps/web
```

The HTML reports land in `apps/{api,web}/coverage/index.html` (gitignored). The committed copies in this folder are the JSON summaries plus this README.
