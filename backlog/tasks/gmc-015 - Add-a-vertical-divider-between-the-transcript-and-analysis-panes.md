---
id: GMC-015
title: Add a vertical divider between the transcript and analysis panes
status: In Progress
assignee:
  - '@opencode'
created_date: '2026-07-12 22:33'
updated_date: '2026-07-12 22:34'
labels: []
dependencies: []
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Cosmetic polish: the two panes in index.html (dark transcript on the left, light analysis on the right) currently butt together with no visual seam. Add a subtle 1px divider so the split reads clearly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The .analysis pane has a left border (1px solid #e5e7eb) that renders a visible vertical divider between the transcript and analysis panes; no other layout or behavior changes.
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
