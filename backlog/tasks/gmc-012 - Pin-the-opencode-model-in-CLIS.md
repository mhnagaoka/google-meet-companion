---
id: GMC-012
title: Pin the opencode model in CLIS
status: To Do
assignee:
  - '@claude'
created_date: '2026-07-12 15:29'
labels: []
dependencies: []
references:
  - GMC-010
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CLIS.opencode is 'opencode run' with no -m flag, so the analysis model depends on the machine's opencode default — on this machine no default is pinned at all, making the analyzer nondeterministic. GMC-010's evaluation validated opencode-go/deepseek-v4-flash (clean stdout under non-TTY spawn, analysis quality preferred by the user, free on the opencode Go plan; same model the sibling meeting-companion project uses). Pin it in CLIS.opencode and update the PRD's Configuration section if it lists the CLI commands.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLIS.opencode spawns 'opencode run -m opencode-go/deepseek-v4-flash'
- [ ] #2 Existing tests still pass (CLI descriptors are injectable; no test depends on the unpinned form)
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
