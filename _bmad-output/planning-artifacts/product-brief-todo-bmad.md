---
title: "Product Brief: todo-bmad"
project_name: todo-bmad
author: Luca Romagnoli
date: 2026-04-27
status: draft
workflowType: product-brief
inputDocuments:
  - docs/prd-input.md
---

# Product Brief — todo-bmad

## Executive Summary

A minimal, single-user Todo web application that lets a person capture, complete, and clear personal tasks without friction. The product is intentionally narrow: no accounts, no collaboration, no priorities or due dates — just a fast, reliable list that works the same on a phone or a laptop, and keeps its state across refreshes. Its success is measured by whether a first-time user can do everything without being told how.

## Problem & Opportunity

People who want to track a handful of personal tasks today face a choice between heavyweight apps (notion-style workspaces, full project managers) and ephemeral notes (sticky notes, scratch text files). The first group is over-engineered for a five-item shopping list; the second loses state and offers no completion semantics. The opportunity is a "just enough" product: durable across sessions, instantly understandable, and small enough to be a credible foundation for future features (auth, collaboration) without rewriting it.

## Target Users & Value

- **Primary user:** an individual managing personal tasks on their own device.
- **Value proposition:** open the app → see your list → add, complete, delete. No onboarding, no decisions, no waiting.
- **Non-goals (initial release):** team workflows, task prioritization, deadlines, notifications, sharing, accounts.

## Solution Overview

A full-stack web app with three deliberately simple parts:

1. **Frontend** — a responsive single-page UI that renders the todo list, supports add/toggle/delete, and provides clear empty / loading / error states. Optimistic updates make every action feel immediate.
2. **Backend API** — a small REST service exposing CRUD on a single `todos` resource, with input validation, durable storage, and graceful error responses.
3. **Storage** — a lightweight embedded database (SQLite) so the app survives restarts and a single `docker-compose up` brings the whole stack online.

Architecture stays open to future authentication and multi-user support: the data model can be scoped by an `owner_id` later without redesign, and the API surface is a clean enough boundary to slot a session layer in front of it.

## Success Metrics

- **Usability:** a first-time user completes create / complete / delete with no instructions.
- **Stability:** state survives refresh, restart, and container redeploy.
- **Quality bar:** ≥70% meaningful test coverage, ≥5 passing Playwright E2E tests, zero critical WCAG AA violations, runs end-to-end via `docker-compose up`.
- **Maintainability:** a new developer can clone, build, run, and contribute within 15 minutes using the README.

## Constraints & Assumptions

- Single-user, single-device — no auth, no realtime sync, no offline queue.
- Modern evergreen browsers only.
- Latency target: interactions feel instantaneous on a local stack (UI updates ≤100 ms perceived).
- Deployment target for this exercise is local Docker Compose; cloud deploy is out of scope.

## Risks

- **Over-engineering:** the rubric demands many things (Docker, E2E, accessibility, security review) for a tiny app — the risk is bloating the codebase to satisfy each box. Mitigation: keep the code minimal; let tests, audits, and Dockerfiles do the rubric work.
- **Premature flexibility:** designing for hypothetical auth/multi-user can corrupt the MVP. Mitigation: leave hooks (resource scoping, clean API boundary) but don't build them.

## Next Step

Use this brief plus `docs/prd-input.md` as input to PRD creation (`prd-todo-bmad.md`).
