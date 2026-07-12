---
id: DRAFT-003
title: Inline initial /state into the meeting-page shell
status: Draft
assignee: []
created_date: '2026-07-12 18:24'
labels:
  - frontend
  - perf
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Optimization idea from GMC-003 review. Optional; only do if the first-paint blank flash on GET /m/<id> is actually noticeable.

Today the shell (index.html) is byte-identical for every meeting and paints blank columns until the first /state poll returns (~1 round-trip). Idea: have GET /m/<id> inject the current /state payload into the shell as an inline <script> (e.g. window.__INITIAL__ = {...}), so the client renders the first frame with zero round-trips, then polls /state as it does now.

Why this over server-side rendering (SSR): keeps a single render path (the browser's), adds no server-side markdown dependency (marked stays a CDN script), and the page is live so /state polling is needed regardless. See GMC-003 discussion.

Cost / trade-off:
- The shell is no longer byte-identical per meeting — the server.test.js assertion 'shell is identical bytes for every id' would need to change (assert the static-shell portion, or drop it).
- Source of the inlined payload must be the in-memory session (same object /state serializes), NOT transcript.txt/analysis.txt, which lag the Map.
- If the id has no session yet, inline an empty/placeholder state (mirror the /state 404 path) so the client just polls.

Acceptance sketch:
- GET /m/<id> for an existing session returns HTML whose inline initial state matches what GET /m/<id>/state would return at that instant.
- Client renders immediately from the inlined state (no visible blank flash), then continues polling every ~2s with updatedAt gating unchanged.
- Autoscroll / markdown / header behavior identical to current.

YAGNI note: defer until the flash is a real, observed problem.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
