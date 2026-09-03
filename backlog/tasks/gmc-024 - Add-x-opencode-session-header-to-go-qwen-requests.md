---
id: GMC-024
title: Add x-opencode-session header to go-qwen requests
status: Done
assignee: []
created_date: '2026-09-03 11:40'
updated_date: '2026-09-03 11:42'
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
- [x] #1 The go-qwen fetch call to llm.url sends x-opencode-session: <meeting id> on every request
- [x] #2 Session id is stable per meeting across analysis ticks and server restarts (it is the meeting id, not a random uuid)
- [x] #3 Tests assert the header is present on outbound go-qwen requests
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [x] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add 'x-opencode-session': s.id to the fetch headers in analyze() (server.js). 2. Test: inject an llm.url strategy via createApp whose server asserts the header, assert the value equals the meeting id.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Validation: npm test 18/18 pass; biome clean for touched files (3 pre-existing infos in bookmarklet.src.js/build-bookmarklet.js, untouched — same baseline as GMC-018). Evidence per AC: AC1+AC3 — mock-endpoint test now asserts received.headers['x-opencode-session'] === ID1 on the outbound POST (server.test.js:485); AC2 — value sent is s.id, and the test asserts it equals the meeting id, which is the session key re-derived from the URL path on every request (stable across ticks and restarts by construction). Ponytail review: 2-line server diff + 1 test assertion + 1 constraint comment, nothing to cut. PRD/docs: no deviation — transport detail, PRD go-qwen row unchanged.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added x-opencode-session: <meeting id> to the go-qwen fetch headers in analyze() (server.js), so opencode's session-affinity routing keeps each meeting's prompt cache warm and requests stay compliant ahead of the 09/06 enforcement deadline. Verified with the extended mock-endpoint test asserting the header equals the meeting id; npm test 18/18, biome clean.
<!-- SECTION:FINAL_SUMMARY:END -->
