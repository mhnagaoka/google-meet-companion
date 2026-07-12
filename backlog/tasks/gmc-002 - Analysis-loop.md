---
id: GMC-002
title: Analysis loop
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 04:07'
updated_date: '2026-07-12 13:17'
labels: []
dependencies:
  - GMC-001
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Periodic LLM analysis of live transcripts via CLI shell-out. See docs/PRD.md 'Components > 2. Node server' (Analysis loop), 'Configuration', and Milestone 2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 One global setInterval(ANALYZE_EVERY) loops the session Map — no per-session timers
- [x] #2 A session is analyzed only when dirty (set by the caption upsert handler, cleared on spawn) and no run is in flight
- [x] #3 CLI is spawned async with the prompt on stdin (never sync, never argv)
- [x] #4 Prior analysis is injected into the prompt per Configuration
- [x] #5 Per-session in-flight flag prevents concurrent runs racing to write the same analysis.txt; captions arriving mid-run set dirty again
- [x] #6 spawn's { timeout } option (~5 min) guards hangs so a wedged CLI can't hold the in-flight flag forever
- [x] #7 An empty or killed reply never clobbers the last good analysis.txt
- [x] #8 transcript.txt is rewritten on each analysis tick and once on shutdown
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. server.js: PT-BR PROMPT constant (from PRD Configuration) + CLIS map {claude: -p --model sonnet --effort low, opencode: run}, both fed on stdin
2. Session gains dirty/inflight flags; caption handler sets dirty and stops writing transcript.txt
3. One global setInterval((ANALYZE_EVERY||120)s) in createApp, unref'd, cleared on server close; per session: dirty && !inflight -> analyze()
4. analyze(): clear dirty, set inflight, rewrite transcript.txt, spawn CLI async with {timeout: 5min}, prompt on stdin (prior analysis injected per PRD framing); on close: clear inflight, ignore empty/nonzero-exit output, else write analysis.txt + update state. Tick body try/caught so disk failures can't kill the process (tick runs outside the request error boundary)
5. Shutdown flush: rewrite all transcripts on server 'close'; main block traps SIGINT/SIGTERM -> closeAllConnections + server.close -> exit
6. Tests: fake CLI via node -e; cover dirty gating/no-rerun-when-clean, stdin prompt + prior-analysis injection, empty and timeout-killed replies keep last good analysis.txt, inflight blocks concurrent spawns, flush-on-close; adapt GMC-001 tests that assumed per-POST writes (disk assert after close; write-failure test becomes tick-survives-disk-failure)
7. PRD: update Component 2 + Local storage (transcript writer moves from caption POST to analysis tick + shutdown flush)
8. biome check, node --test, ponytail review
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Design decisions:
- AC #8 supersedes the PRD's per-POST transcript write (the ponytail comment in the caption handler anticipated this move); PRD 'Writes meetings/...' paragraph updated accordingly. Caption handler now only upserts memory and sets dirty.
- Shutdown flush rides the server 'close' event; main block traps SIGINT/SIGTERM -> closeAllConnections + close -> exit, so tests exercise the same flush path via server.close().
- CLI descriptors: CLIS = { claude: `claude -p --model sonnet --effort low`, opencode: `opencode run` }, prompt on stdin; llm and every are injectable via createApp for tests (fake CLI = node -e).
- Empty/killed guard is one branch: on 'close', code !== 0 || !out.trim() -> keep last good analysis.
- Tick body try/caught (it runs outside the request error boundary); disk failures log and degrade persistence only.
Validation: biome clean; node --test 11/11 pass, covering dirty gating, no re-run when clean, stdin prompt + prior-analysis injection, empty reply non-clobber, in-flight blocking + spawn-timeout kill/release, tick disk-failure survival, shutdown flush (upsert + restart-recovery tests).
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
<!-- DOD:END -->
