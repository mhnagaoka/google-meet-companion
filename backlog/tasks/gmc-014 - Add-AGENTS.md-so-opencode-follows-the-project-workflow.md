---
id: GMC-014
title: Add AGENTS.md so opencode follows the project workflow
status: Done
assignee: []
created_date: '2026-07-12 21:52'
updated_date: '2026-07-12 21:53'
labels:
  - tooling
dependencies: []
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
opencode reads AGENTS.md (not CLAUDE.md), so a delegated opencode/Kimi agent currently gets zero project instructions and must rediscover the backlog CLI, branch-per-task rule, conventional commits, and ponytail on its own. Symlink AGENTS.md -> CLAUDE.md so opencode auto-loads the same workflow Claude follows, with zero duplication (single source of truth stays CLAUDE.md).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AGENTS.md exists at repo root as a symlink to CLAUDE.md
- [x] #2 opencode run picks up the workflow (backlog CLI, branch-per-task, conventional commits, ponytail) without per-prompt instructions
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Symlinked AGENTS.md -> CLAUDE.md. Verified opencode/Kimi loads the workflow unprompted (named the backlog CLI + branch-per-task rule with no instructions). Single source of truth stays CLAUDE.md.
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
