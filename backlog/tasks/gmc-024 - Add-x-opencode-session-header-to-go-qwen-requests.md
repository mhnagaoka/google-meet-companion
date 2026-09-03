---
id: GMC-024
title: Add x-opencode-session header to go-qwen requests
status: To Do
assignee: []
created_date: '2026-09-03 11:40'
labels: []
dependencies: []
references:
  - 'https://opencode.ai/docs/go'
  - 'https://x.com/opencode/status/2095411861730562143'
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
OpenCode Go announced (2026-09-03) that API requests must carry an x-opencode-session header (one stable id per conversation); from 09/06 requests missing it may error. The email flagged this project's go-qwen strategy: Node fetch calls to https://opencode.ai/zen/go/v1/chat/completions with no session header. The header enables opencode's session-affinity routing (same conversation -> same upstream -> warm prefix cache). Value: the meet code (s.id), already stable per conversation and across server restarts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The go-qwen fetch call to llm.url sends x-opencode-session: <meeting id> on every request
- [ ] #2 Session id is stable per meeting across analysis ticks and server restarts (it is the meeting id, not a random uuid)
- [ ] #3 Tests assert the header is present on outbound go-qwen requests
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
