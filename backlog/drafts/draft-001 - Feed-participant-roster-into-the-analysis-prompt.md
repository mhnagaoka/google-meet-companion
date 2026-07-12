---
id: DRAFT-001
title: Feed participant roster into the analysis prompt
status: Draft
assignee: []
created_date: '2026-07-12 14:56'
labels: []
dependencies: []
references:
  - GMC-011
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up to GMC-011: speaker-label reconciliation can only recover names of people who spoke. Scrape Meet's participant list in the bookmarklet, POST it with the session, and include the roster in the analysis prompt so names of silent participants (and better nickname resolution) are available to the model. Promote this draft only if GMC-011's prompt-only fix proves insufficient on real meetings; implementation depends on the bookmarklet (GMC-004).
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
