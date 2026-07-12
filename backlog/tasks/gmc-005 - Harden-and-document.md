---
id: GMC-005
title: Harden and document
status: To Do
assignee: []
created_date: '2026-07-12 04:07'
labels: []
dependencies:
  - GMC-002
  - GMC-003
  - GMC-004
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
README and final hardening pass for v1. See docs/PRD.md Milestone 5.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 README covers: installing the bookmarklet, enabling captions in Meet, and the one-time Local Network Access prompt
- [ ] #2 Content-dedup is added only if item-element swaps produce duplicate lines in real use; otherwise its omission is noted
- [ ] #3 Full flow works end to end following only the README
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No type check errors
- [ ] #2 No linting errors
- [ ] #3 All unit tests passing
- [ ] #4 Code is reviewed by ponytail
<!-- DOD:END -->
