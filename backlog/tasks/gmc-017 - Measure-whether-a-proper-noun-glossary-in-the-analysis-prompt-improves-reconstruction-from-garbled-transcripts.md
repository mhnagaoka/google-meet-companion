---
id: GMC-017
title: >-
  Measure whether a proper-noun glossary in the analysis prompt improves
  reconstruction from garbled transcripts
status: In Progress
assignee: []
created_date: '2026-07-14 15:44'
labels: []
dependencies: []
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Spike/experiment. The analysis PROMPT (server.js) tells the model captions may contain errors but gives no domain context. Question: does injecting a short glossary of org-specific proper nouns (project names, internal tools) into the prompt measurably improve the analysis when fed a garbled transcript? Prior runs showed the model already reconstructs generic jargon on its own, so the expected lever is proper-noun resolution and topic-name consistency, not domain framing. Likely outcome: marginal gain; branch probably NOT merged to main — the task documents the finding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A control analysis exists: raw garbled transcript, current prompt, frozen-prefix (real timestamps), single run (no history)
- [ ] #2 A treatment analysis exists: same raw transcript + frozen-prefix, but with a proper-noun glossary added to PROMPT
- [ ] #3 The two analyses are diffed and the glossary's effect (name resolution, consistency, hallucinations) is documented in the task notes
- [ ] #4 Decision recorded: is the glossary worth making permanent (new task) or not (branch stays unmerged)
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
