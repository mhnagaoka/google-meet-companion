---
id: GMC-016
title: Add plain-text download endpoints for transcript and analysis
status: To Do
assignee: []
created_date: '2026-07-12 23:05'
labels: []
dependencies: []
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Today the only way to get a meeting's transcript or analysis out is scraping the live page or reading the meetings/<id>/ dir directly. Add two GET endpoints that serve the raw content, reusing the same memory-or-disk fallback the /state handler already uses (getSession for live sessions, loadDiskMeeting for disk-only).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET /m/<id>/transcript.txt returns the full transcript as Content-Type text/plain (live session if present, else disk prefix); unknown id returns 404
- [ ] #2 GET /m/<id>/analysis.md returns the latest analysis as Content-Type text/markdown; a meeting with no analysis yet (or unknown id) returns 404
- [ ] #3 The ROUTE regex is extended to accept the two new subpaths; non-GET methods on them return 404, consistent with the existing /state and /caption handling
- [ ] #4 Tests cover: transcript download from a live session, transcript download from a disk-only meeting, unknown-id 404, analysis download, and the missing-analysis 404 case
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
