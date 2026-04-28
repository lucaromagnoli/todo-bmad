# Accessibility Audit — todo-bmad

**Generated:** 2026-04-28
**Tool:** axe-core via `@axe-core/playwright` (axe v4.10.x)
**Standards:** WCAG 2.0 A + AA, WCAG 2.1 A + AA
**Rubric requirement:** zero critical violations
**Result:** ✅ zero violations of *any* impact across all three audited states.

## Audited States

| State           | Violations | Incomplete | Outcome |
| --------------- | ---------- | ---------- | ------- |
| Empty list      | 0          | 0          | ✅ pass |
| Populated list  | 0          | 0          | ✅ pass |
| Error banner    | 0          | 0          | ✅ pass |

The "populated" state includes a mix of active and completed todos so the
strikethrough/muted text styling is exercised against the contrast checks.
The "error" state shows the dismissable banner with `role="alert"`.

## What axe-core checks (subset)

color-contrast, label, button-name, aria-allowed-attr, aria-required-attr,
aria-valid-attr-value, focus-order-semantics, region, document-title,
html-has-lang, landmark-one-main, list, listitem, html-lang-valid,
heading-order, link-name.

Full per-rule output is in the JSON files alongside this README.

## What we did to get here

- Real semantic elements (`<main>`, `<h1>`, `<form>`, `<ul>`, `<li>`,
  `<button>`, `<input type="checkbox">`).
- Visible text + a `<label htmlFor>` for the new-todo input (with a
  `.visually-hidden` class that hides the label visually but keeps it for
  assistive tech).
- Per-row aria-labels on the toggle checkbox and delete button so each
  is announced with the todo text it operates on
  (e.g. `Toggle "walk the dog"`, `Delete "walk the dog"`).
- `role="alert"` on the error banner; `role="status"` on the inline form
  error and the loading text so they're announced politely.
- `aria-invalid` + `aria-describedby` on the input when an inline error
  is present.
- Color contrast checked: `--accent` (`#2563eb`) on white text, and the
  muted-text completed style still passes AA on `--bg`.

## How to regenerate

```bash
docker compose up -d --build           # bring the stack up
cd e2e
npx playwright test a11y.spec.ts
```

Each test writes its raw `axe.results` JSON to this directory.
