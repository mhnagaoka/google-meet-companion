---
id: GMC-013
title: Browse and load past meetings from disk
status: In Progress
assignee:
  - '@mau'
created_date: '2026-07-12 19:17'
updated_date: '2026-07-12 22:04'
labels:
  - frontend
  - backend
dependencies:
  - GMC-003
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After a server restart (or crash-rejoin), meetings already on disk are invisible: sessions are created only on a caption POST, and GET / lists only in-memory sessions, so the browse index is empty and /m/<id>/state 404s until someone speaks again. Let users browse past meetings and view their saved transcript + analysis without waiting for a new caption.

Core primitive: load a meeting from its on-disk dir (meetings/<date>-<id>/). Expose it two ways — an index listing (browse) and a per-id read (view). See GMC-003 discussion.

Design decisions already made:
- The disk read lives in GET /m/<id>/state, NOT GET /m/<id>. The page shell (SHELL) stays byte-identical for every id (keep the 'shell is identical bytes' test passing); it carries no per-meeting data.
- /state reads-and-returns from disk on a Map miss WITHOUT inserting a session into the Map (pure read). Materializing a live session would make the global analyze tick fire an LLM run on an ended meeting. Read path never creates state; only the caption POST (write path) does.
- Rejoin-continuity falls out for free: the first caption POST after rejoin hits getSession, which already recovers transcript.txt as the frozen prefix. Add analysis recovery there too (read analysis.txt into s.analysis, set updatedAt from mtime) so the right pane isn't blank on return.

Keep it minimal (ponytail): the meetings/ directory listing IS the feature. No search, filters, pagination, delete, metadata store, or date grouping.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET / lists on-disk meetings (union with any in-memory sessions), each linking to its /m/<id> page; title recovered from the transcript's first line or falls back to the id
- [ ] #2 GET /m/<id>/state returns the saved transcript + analysis from disk when the id has a meeting dir but no live session
- [ ] #3 A view-only (disk-backed) load creates no in-memory session and triggers no analyze tick / LLM call
- [ ] #4 getSession restores analysis from analysis.txt (and updatedAt from mtime) so a rejoined live meeting shows prior analysis immediately, not a blank pane
- [ ] #5 GET /m/<id> still serves byte-identical SHELL for every id (unchanged); the 'shell is identical bytes for every id' test still passes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a disk-scan helper: list meetings/ subdirs, parse <date>-<id> to derive id, read title from transcript.txt first line.
2. GET /: union in-memory sessions with the disk scan; dedupe by id; render the existing <ul>.
3. GET /m/<id>/state: on sessions.get(id) miss, if a meeting dir exists, read transcript.txt + analysis.txt and return the same JSON shape as the live path — without inserting into the Map.
4. getSession: alongside the existing transcript.txt->prefix recovery, read analysis.txt into s.analysis and set updatedAt from the file mtime.
5. Tests: disk-backed /state returns saved data and creates no session/tick; GET / lists a disk-only meeting; analysis recovery on getSession; shell-identical test still green.
6. Note the deferred edges as ponytail comments (cross-midnight <date>-<id> mismatch on next-day rejoin; no analyze tick on view-only).
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
