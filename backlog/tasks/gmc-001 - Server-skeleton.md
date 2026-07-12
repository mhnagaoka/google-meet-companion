---
id: GMC-001
title: Server skeleton
status: To Do
assignee: []
created_date: '2026-07-12 04:06'
updated_date: '2026-07-12 04:20'
labels: []
dependencies:
  - GMC-006
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Node server (server.js, stdlib http only) with in-memory session Map and transcript persistence. Foundation every other component talks to. See docs/PRD.md 'Components > 2. Node server' and Milestone 1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Server binds to 127.0.0.1 explicitly, never 0.0.0.0
- [ ] #2 POST /m/<id>/caption upserts {title, id, speaker, text} into the session's ordered Map, creating the session from the path <id> on first POST
- [ ] #3 All /m/... routes share one strict id parser (^/m/([a-z]{3}-[a-z]{4}-[a-z]{3})(/caption|/state)?$); anything else 404s before touching disk or the Map
- [ ] #4 Body is capped (~64 KB) and JSON.parse is wrapped in try/catch returning 400 — malformed input never kills the process
- [ ] #5 CORS: caption POST answers OPTIONS preflight with 204 and pins Access-Control-Allow-Origin to https://meet.google.com
- [ ] #6 GET / lists active meetings with links; GET /m/<id> serves a constant placeholder shell (identical bytes for every id); GET /m/<id>/state returns {title, transcript, analysis, updatedAt}
- [ ] #7 meetings/<date>-<id>/transcript.txt is rewritten whole from the utterance map (title header first line), and meetings/ is git-ignored
- [ ] #8 Restart recovery: existing transcript.txt at session creation is read into a frozen prefix; renders are prefix + lines-from-map
- [ ] #9 Verified with curl posting fake captions under two different ids
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
<!-- DOD:END -->
