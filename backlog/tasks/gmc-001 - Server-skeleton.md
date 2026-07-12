---
id: GMC-001
title: Server skeleton
status: Done
assignee:
  - '@claude'
created_date: '2026-07-12 04:06'
updated_date: '2026-07-12 04:55'
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
- [x] #1 Server binds to 127.0.0.1 explicitly, never 0.0.0.0
- [x] #2 POST /m/<id>/caption upserts {title, id, speaker, text} into the session's ordered Map, creating the session from the path <id> on first POST
- [x] #3 All /m/... routes share one strict id parser (^/m/([a-z]{3}-[a-z]{4}-[a-z]{3})(/caption|/state)?$); anything else 404s before touching disk or the Map
- [x] #4 Body is capped (~64 KB) and JSON.parse is wrapped in try/catch returning 400 — malformed input never kills the process
- [x] #5 CORS: caption POST answers OPTIONS preflight with 204 and pins Access-Control-Allow-Origin to https://meet.google.com
- [x] #6 GET / lists active meetings with links; GET /m/<id> serves a constant placeholder shell (identical bytes for every id); GET /m/<id>/state returns {title, transcript, analysis, updatedAt}
- [x] #7 meetings/<date>-<id>/transcript.txt is rewritten whole from the utterance map (title header first line), and meetings/ is git-ignored
- [x] #8 Restart recovery: existing transcript.txt at session creation is read into a frozen prefix; renders are prefix + lines-from-map
- [x] #9 Verified with curl posting fake captions under two different ids
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. server.js: createApp({dir}) factory (stdlib http) returning the server; direct-run entry listens on 127.0.0.1:PORT
2. One strict id regex routes everything; 404 otherwise
3. Session Map created on first caption POST; restart recovery reads existing transcript.txt into frozen prefix; transcript rewritten whole on each POST (analysis tick doesn't exist until GMC-002)
4. 64KB body cap (413), try/catch JSON.parse (400), CORS pinned to https://meet.google.com with OPTIONS 204
5. GET / meeting list, GET /m/<id> constant shell placeholder, GET /m/<id>/state JSON
6. meetings/ gitignored; server.test.js (node:test + fetch) covers all ACs incl. restart recovery; add 'test': 'node --test' script
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
server.js + server.test.js (7 node:test tests, all passing), test script added. Verified with curl under two ids incl. upsert-in-place and per-id transcript files.

Ponytail review: applied 2 shrinks (single-literal SHELL, mkdtemp folded into test start() helper). Biome clean, 7/7 tests passing after fixes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added server.js (stdlib http, no deps): createApp({dir}) factory binding 127.0.0.1, strict Meet-code regex router, caption upsert into per-session ordered Map with server-stamped HH:MM, 64KB body cap + JSON try/catch, CORS pinned to https://meet.google.com, GET / list / constant shell / state JSON, transcript.txt rewritten whole with frozen-prefix restart recovery. Verified with 7 node:test HTTP tests (npm test) and live curl under two meeting ids.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
<!-- DOD:END -->
