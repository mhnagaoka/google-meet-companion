---
id: GMC-010
title: Evaluate analysis loop on a real meeting transcript
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 14:32'
updated_date: '2026-07-12 14:56'
labels: []
dependencies: []
references:
  - /home/mau/Downloads/2026-07-10-daily-dark-app.md
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Feed the real 2026-07-10 'Daily Dark App' meeting transcript (Google Meet export: 'Speaker: text' lines, no timestamps) through the analysis loop via dev/replay.js and evaluate the quality of the generated analysis against the PROMPT's six sections. Privacy constraint: the transcript stays outside the repo (~/Downloads) and generated artifacts stay under the gitignored meetings/ dir — nothing meeting-related enters git history. Findings go in this task's notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The transcript is replayed into a running server and at least two analysis ticks complete, so prior-analysis injection and section 6 (desde a última análise) are exercised
- [ ] #2 Header/participant lines from the export are not fed as captions (preprocess; only 'Speaker: text' lines go through)
- [ ] #3 Analysis output is evaluated against the six PROMPT sections and findings are recorded in the task's implementation notes
- [ ] #4 Neither the transcript nor generated meeting artifacts are committed to git
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preprocess: grep only 'Speaker: text' lines into /tmp/gmc010-captions.txt (drops title/participants headers and blanks) — no replay.js change needed
2. Start server (ANALYZE_EVERY=120, default claude sonnet low effort), background, log to /tmp
3. Watch analysis.txt checksum every 20s to evidence distinct analysis ticks
4. node dev/replay.js /tmp/gmc010-captions.txt drk-appd-ily 500 (~6 min replay => ~3 ticks)
5. After replay + final tick: evaluate analysis vs the six PROMPT sections, record findings in notes, SIGINT server (shutdown flush)
6. No code changes expected: DoD branch/merge items N/A; artifacts stay in gitignored meetings/ and /tmp
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Finding: Meet ASR corrupts person names inside speech while speaker labels stay correct ('Mal' for Mau/Mauricio, 'Damari' for 'da Mari'/Mariana), and the analysis inherits them. Follow-ups: GMC-011 (prompt-side name reconciliation) and draft GMC-012 (participant roster scraping, contingent on GMC-011 falling short + GMC-004).
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
