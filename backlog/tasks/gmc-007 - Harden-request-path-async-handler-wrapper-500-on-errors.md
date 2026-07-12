---
id: GMC-007
title: 'Harden request path: async handler wrapper, 500 on errors'
status: Done
assignee:
  - '@claude'
created_date: '2026-07-12 05:23'
updated_date: '2026-07-12 05:36'
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
- [x] #1 All request handling funnels through a single async handler; request body is read with for await (no data/end event callbacks)
- [x] #2 Any sync throw or promise rejection in the request path logs the error and responds 500 when headers are not yet sent (connection just ends otherwise); the process never exits
- [x] #3 A caption POST whose transcript write fails (e.g. session dir removed mid-meeting) returns 500 but the upsert survives in memory and GET /m/<id>/state still serves it
- [x] #4 Existing tests keep passing; a new test forces a write failure and asserts the 500 plus a subsequent successful request
- [x] #5 A comment at the createServer wrapper states the invariant: it is the only error boundary, new routes go inside handle(), a second listener needs its own wrapper
- [x] #6 PRD component 2 documents the single wrapped async handler as the request-path error boundary (500 + log on unhandled errors)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Restructure server.js: routes move into a single async handle(req, res); createServer callback becomes handle().catch(...) that logs, writes 500 if !res.headersSent, ends — with the invariant comment (AC #5).
2. Rewrite handleCaption as async: read body via for await (const chunk of req), keeping the 64KB→413 and JSON→400 semantics; deletes data/end callbacks and the writableEnded guard.
3. New test: caption POST, turn the session dir into a plain file, next POST asserts 500; GET /state still serves the upsert; subsequent request proves the process survived.
4. PRD Component 2: one sentence documenting the wrapped async handler as the request-path error boundary (500 + log).
5. npm test, npm run check, ponytail review of the diff, finalize per workflow.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented per the settled design: routes moved into async handle(req, res); createServer callback is handle().catch that logs, writes 500 iff !res.headersSent, and ends. Body read via for await deletes the data/end callbacks and the writableEnded guard (server.js net -3 lines in the handler). New test turns the session dir into a plain file so the transcript write throws ENOTDIR: POST answers 500, the upsert survives in memory, and GET /state (a subsequent request) proves the process survived. PRD Component 2 gained the error-boundary bullet. Ponytail review: nothing to cut — no abstractions added, both new comments carry constraints the code can't show. Validation: npm test 8/8 pass, npm run check clean.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Request path hardened: all routes funnel through one async handle(req, res) whose top-level .catch logs and answers 500 (when headers aren't sent), so disk failures degrade persistence instead of killing the server. Body reading switched to for await, deleting the data/end callbacks; 413/400 semantics unchanged. Invariant comment at the createServer wrapper; PRD Component 2 documents the error boundary. Verified: new write-failure test (500 + upsert survives in memory + subsequent request served) plus all 7 existing tests pass, Biome clean. Merged to main with --no-ff.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [x] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
