---
id: GMC-011
title: Reconcile mis-transcribed names in the analysis prompt
status: To Do
assignee:
  - '@claude'
created_date: '2026-07-12 14:55'
labels: []
dependencies: []
references:
  - GMC-010
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GMC-010's real-transcript evaluation showed Meet's ASR corrupts person names inside speech while speaker labels stay correct (they come from the DOM, not ASR): 'Mal' for 'Mau' (Mauricio), 'Damari' for 'da Mari' (Mariana). The analysis inherited these ('Alan/Damari' as if Damari were an entity). Add a prompt instruction telling the model to reconcile names mentioned inside utterances against the speaker labels, considering nicknames and diminutives (Mari = Mariana, Mau = Mauricio), and to keep the transcribed form when the match is uncertain (clients or people outside the call must not be force-mapped).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 PROMPT instructs the model that names inside speech may be ASR-corrupted and should be reconciled against speaker-label names, with an uncertainty escape hatch
- [ ] #2 Re-running the analysis over the GMC-010 transcript resolves 'Damari' to Mariana and 'Mal' to Mauricio in the output
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
