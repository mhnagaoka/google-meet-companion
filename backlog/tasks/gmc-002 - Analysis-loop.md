---
id: GMC-002
title: Analysis loop
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 04:07'
updated_date: '2026-07-12 13:11'
labels: []
dependencies:
  - GMC-001
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Periodic LLM analysis of live transcripts via CLI shell-out. See docs/PRD.md 'Components > 2. Node server' (Analysis loop), 'Configuration', and Milestone 2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 One global setInterval(ANALYZE_EVERY) loops the session Map — no per-session timers
- [ ] #2 A session is analyzed only when dirty (set by the caption upsert handler, cleared on spawn) and no run is in flight
- [ ] #3 CLI is spawned async with the prompt on stdin (never sync, never argv)
- [ ] #4 Prior analysis is injected into the prompt per Configuration
- [ ] #5 Per-session in-flight flag prevents concurrent runs racing to write the same analysis.txt; captions arriving mid-run set dirty again
- [ ] #6 spawn's { timeout } option (~5 min) guards hangs so a wedged CLI can't hold the in-flight flag forever
- [ ] #7 An empty or killed reply never clobbers the last good analysis.txt
- [ ] #8 transcript.txt is rewritten on each analysis tick and once on shutdown
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
<!-- DOD:END -->
