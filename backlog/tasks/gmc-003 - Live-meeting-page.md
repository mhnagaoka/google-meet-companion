---
id: GMC-003
title: Live meeting page
status: To Do
assignee: []
created_date: '2026-07-12 04:07'
updated_date: '2026-07-12 04:20'
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
- [ ] #1 Two full-height columns: transcript left (dark, monospace, pre-wrap), analysis right (light, markdown rendered via a small CDN library)
- [ ] #2 Header shows meeting title and last-analysis time from /state
- [ ] #3 Shell is static and identical for every meeting; JS derives <id> from location.pathname and polls /m/<id>/state every ~2s
- [ ] #4 Re-render is gated on updatedAt — unchanged state does no work
- [ ] #5 Transcript autoscrolls only when already at the bottom
- [ ] #6 GET /m/<id> serves this shell instead of the GMC-001 placeholder
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
<!-- DOD:END -->
