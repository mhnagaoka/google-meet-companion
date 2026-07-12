---
id: GMC-007
title: 'Harden request path: async handler wrapper, 500 on errors'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 05:23'
updated_date: '2026-07-12 05:34'
labels: []
dependencies:
  - GMC-001
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sync throws and promise rejections inside request handlers (e.g. fs.writeFileSync or fs.mkdirSync failing on the caption path) currently escape as uncaughtException and kill the server mid-meeting — the failure mode GMC-001 AC #4 guarded against for JSON.parse only. Restructure the request path as one async handler with a top-level .catch that logs and answers 500, so disk failures degrade persistence instead of crashing ingestion. Note: covers the request path only; the GMC-002 analysis tick needs its own error guard in that task.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All request handling funnels through a single async handler; request body is read with for await (no data/end event callbacks)
- [ ] #2 Any sync throw or promise rejection in the request path logs the error and responds 500 when headers are not yet sent (connection just ends otherwise); the process never exits
- [ ] #3 A caption POST whose transcript write fails (e.g. session dir removed mid-meeting) returns 500 but the upsert survives in memory and GET /m/<id>/state still serves it
- [ ] #4 Existing tests keep passing; a new test forces a write failure and asserts the 500 plus a subsequent successful request
- [ ] #5 A comment at the createServer wrapper states the invariant: it is the only error boundary, new routes go inside handle(), a second listener needs its own wrapper
- [ ] #6 PRD component 2 documents the single wrapped async handler as the request-path error boundary (500 + log on unhandled errors)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Restructure server.js: routes move into a single async handle(req, res); createServer callback becomes handle().catch(...) that logs, writes 500 if !res.headersSent, ends — with the invariant comment (AC #5).
2. Rewrite handleCaption as async: read body via for await (const chunk of req), keeping the 64KB→413 and JSON→400 semantics; deletes data/end callbacks and the writableEnded guard.
3. New test: caption POST, turn the session dir into a plain file, next POST asserts 500; GET /state still serves the upsert; subsequent request proves the process survived.
4. PRD Component 2: one sentence documenting the wrapped async handler as the request-path error boundary (500 + log).
5. npm test, npm run check, ponytail review of the diff, finalize per workflow.
<!-- SECTION:PLAN:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
