---
id: GMC-009
title: Transcript replay dev tool
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 14:17'
updated_date: '2026-07-12 14:18'
labels: []
dependencies: []
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dev tooling to feed a real meeting transcription through the analysis loop without a live Meet call, so analysis quality can be evaluated on real data. Covers two paths: dev/replay.js POSTs a transcript file line-by-line as live captions (exercises incremental analysis and prior-analysis injection), and the zero-code frozen-prefix path (pre-seed meetings/<date>-<id>/transcript.txt before the first caption POST) for a one-shot analysis that keeps the transcript's original timestamps.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 node dev/replay.js <file> [meet-code] [delay-ms] POSTs each transcript line as a caption to a running local server, paced by the delay
- [x] #2 Lines in '[HH:MM Speaker] text' and 'Speaker: text' formats are parsed into speaker/text; other lines are sent whole with speaker Unknown
- [x] #3 Replay aborts with the failing line number on a non-2xx response
- [x] #4 dev/README.md documents replay.js and the frozen-prefix one-shot path, including the timestamp caveat (server stamps arrival time on replay)
<!-- AC:END -->



## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. dev/replay.js: read transcript file, parse '[HH:MM Speaker] text' / 'Speaker: text' lines, POST each as a caption with paced delay; abort with line number on non-2xx
2. dev/README.md: table row for replay.js + document the frozen-prefix one-shot path and the replay timestamp caveat
3. Smoke test against a local server with ANALYZE_EVERY high (no LLM spawn), biome check
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Backfilled task: implementation done conversationally before the 'code changes require a Backlog task' directive (CLAUDE.md) was adopted; this task records it per the new rule. Smoke test passed (both line formats parsed, transcript rendered via /state), biome clean.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
