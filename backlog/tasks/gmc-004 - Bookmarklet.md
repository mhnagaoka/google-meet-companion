---
id: GMC-004
title: Bookmarklet
status: To Do
assignee: []
created_date: '2026-07-12 04:07'
updated_date: '2026-07-12 23:17'
labels: []
dependencies:
  - GMC-001
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Self-contained inline bookmarklet capturing Meet captions and POSTing upserts to the server. DOM behavior already validated (dev/dom-behavior.md); this wires it to the server. See docs/PRD.md 'Components > 1. Bookmarklet', 'Hard Problems #2', ADR-0001, and Milestone 4.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Readable source in bookmarklet.src.js with all DOM selectors declared up top; build step minifies to the javascript: blob (~1 KB)
- [ ] #2 MutationObserver watches the captions region using the layered selectors; each caption item is tagged via WeakMap<Element,id>
- [ ] #3 Items are POSTed as upserts to /m/<code>/caption as their text grows, coalesced ~400ms
- [ ] #4 Meet code read from location.pathname (rides in the POST path); title from document.title (rides in the body with {id, speaker, text})
- [ ] #5 Failed POSTs (server down) are dropped silently — no buffering
- [ ] #6 End-to-end verified against a real Meet call: captions appear in the live page
- [ ] #7 README.md documents setup on a fresh machine: clone, prerequisites (Node >=24, the LLM CLI), how to start the server, and how to install + use the bookmarklet (enable captions first, one-time Local Network Access prompt)
<!-- AC:END -->



## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
<!-- DOD:END -->
