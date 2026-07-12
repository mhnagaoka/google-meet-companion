---
id: GMC-010
title: Evaluate analysis loop on a real meeting transcript
status: To Do
assignee:
  - '@claude'
created_date: '2026-07-12 14:32'
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

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
