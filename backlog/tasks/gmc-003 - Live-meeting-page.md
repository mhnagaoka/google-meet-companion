---
id: GMC-003
title: Live meeting page
status: Done
assignee:
  - '@mau'
created_date: '2026-07-12 04:07'
updated_date: '2026-07-12 18:01'
labels: []
dependencies:
  - GMC-001
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Static HTML+JS shell (index.html) showing live transcript and analysis. See docs/PRD.md 'Components > 3. The page' and Milestone 3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Two full-height columns: transcript left (dark, monospace, pre-wrap), analysis right (light, markdown rendered via a small CDN library)
- [x] #2 Header shows meeting title and last-analysis time from /state
- [x] #3 Shell is static and identical for every meeting; JS derives <id> from location.pathname and polls /m/<id>/state every ~2s
- [x] #4 Re-render is gated on updatedAt — unchanged state does no work
- [x] #5 Transcript autoscrolls only when already at the bottom
- [x] #6 GET /m/<id> serves this shell instead of the GMC-001 placeholder
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Replace the SHELL constant in server.js (lines 43-45, currently the GMC-001 placeholder) with the real index.html: static shell, two full-height columns (transcript left dark/mono/pre-wrap, analysis right light/markdown via CDN marked), header with title + last-analysis time. JS derives <id> from location.pathname, polls /m/<id>/state ~2s, re-render gated on updatedAt, transcript autoscroll only when already at bottom. The /m/<id> route already serves SHELL (server.js:204), so no routing change needed (AC #6 already wired).
2. Generate via Kimi K2.7 Code (opencode run --auto) with prepended ponytail ruleset; Kimi does not commit and does not touch backlog/.
3. Review diff (ponytail lens) + biome + node --test myself.
4. Commit feat:, merge --no-ff into main, mark Done on main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented by orchestrating Kimi K2.7 Code (opencode run --auto) with a prepended ponytail ruleset; I owned review + verification. Two edits: new index.html (static two-column shell, marked via CDN, updatedAt-gated markdown re-render, bottom-only autoscroll) and server.js SHELL now readFileSync(index.html) at startup. The /m/<id> route already served SHELL (GMC-006), so no routing change — AC6 was pre-wired. Verified myself: npx biome check . clean (8 files), node --test 11/11 pass. No new deps (marked via CDN). No PRD deviation. Merged --no-ff into main (9bd9597).
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
<!-- DOD:END -->
