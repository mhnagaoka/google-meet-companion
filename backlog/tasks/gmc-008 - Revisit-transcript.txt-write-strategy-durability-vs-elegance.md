---
id: GMC-008
title: Revisit transcript.txt write strategy (durability vs elegance)
status: To Do
assignee: []
created_date: '2026-07-12 13:33'
labels: []
dependencies:
  - GMC-005
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Open-ended design discussion, deliberately deferred until after GMC-005 so the decision is informed by real usage (did hard crashes ever happen? did the ≤ANALYZE_EVERY loss window ever bite?).

GMC-002 moved transcript.txt writes from per-caption-POST to the analysis tick + shutdown flush. Three alternatives were analyzed in conversation (2026-07-12):

1. Per-POST sync write (the GMC-001 original): disk never behind memory, zero loss on hard crash; costs a sync rewrite-whole in the request path (was measured-cheap for this workload).
2. Faster tick, analyze every N ticks: flush dirty transcripts every ~10s, run the LLM every Nth tick. Bounds hard-crash loss to the flush interval, keeps one global timer and an I/O-free request path; costs a second dirty flag and two coupled knobs (N = ANALYZE_EVERY / FLUSH_EVERY).
3. Trailing debounce per session: write when POSTs go quiet. Elegant write timing (persists at turn boundaries), but pure debounce has unbounded staleness under sustained caption traffic — worst durability exactly when it matters most — and needs a max-wait deadline (which converges back to option 2) plus per-session timers the PRD deliberately avoids.

Current ranking from that analysis: 2 > 1 > 3 for this codebase, but only if bounded hard-crash loss becomes a real requirement — captions are lossy by nature, clean exits (SIGINT/SIGTERM) already lose nothing, and the analysis is the product. Status quo may well win.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A decision is recorded (keep status quo or switch strategy), with the usage evidence that motivated it
- [ ] #2 If the strategy changes: implementation + tests updated and PRD storage section updated; if not: this task closes with the rationale
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
