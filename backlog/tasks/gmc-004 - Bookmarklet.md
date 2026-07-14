---
id: GMC-004
title: Bookmarklet
status: Done
assignee:
  - '@claude'
created_date: '2026-07-12 04:07'
updated_date: '2026-07-14 12:33'
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
- [x] #1 Readable source in bookmarklet.src.js with all DOM selectors declared up top; build step minifies to the javascript: blob (~1 KB)
- [x] #2 MutationObserver watches the captions region using the layered selectors; each caption item is tagged via WeakMap<Element,id>
- [x] #3 Items are POSTed as upserts to /m/<code>/caption as their text grows, coalesced ~400ms
- [x] #4 Meet code read from location.pathname (rides in the POST path); title from document.title (rides in the body with {id, speaker, text})
- [x] #5 Failed POSTs (server down) are dropped silently — no buffering
- [x] #6 End-to-end verified against a real Meet call: captions appear in the live page
- [x] #7 README.md documents setup on a fresh machine: clone, prerequisites (Node >=24, the LLM CLI), how to start the server, and how to install + use the bookmarklet (enable captions first, one-time Local Network Access prompt)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. bookmarklet.src.js — readable IIFE. Layered region selectors + item/speaker/text selectors as top consts. WeakMap<Element,id> per item; MutationObserver on the region (childList+subtree+characterData) with a ~400ms trailing debounce; on flush, scan items, skip unchanged text (lastText Map), POST {title,id,speaker,text} to http://localhost:8737/m/<code>/caption, .catch()->drop. console.warn if no region. code from location.pathname, title from document.title.
2. build-bookmarklet.js (node stdlib) — strip comments + collapse whitespace, prefix javascript:, write the blob. npm 'build:bookmarklet' script. Source authored minifier-safe (explicit semicolons, no // line comments in code).
3. README.md — fresh-machine setup (clone, Node>=24 + LLM CLI, start server, install/use bookmarklet, captions-on + one-time LNA).
4. Test: assert the built blob starts with javascript: and parses as valid JS (new Function). Skip DOM unit tests (browser code; verified E2E in AC#6).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented bookmarklet.src.js (readable IIFE), build-bookmarklet.js minifier + npm 'build:bookmarklet' script, build-bookmarklet.test.js (2 tests), README.md, .gitignore (blob is a build artifact), and a biome per-file override (semicolons 'always' on the src so whitespace-collapse minify stays ASI-safe). Blob ~1.4KB, parses OK. 16/16 tests pass, biome clean. Deviation recorded in PRD Hard Problems #1: dropped the exclude list (observer is region-scoped + reads only .nMcdL.bj4p3b, so non-caption UI can't match). AC#6 (real Meet E2E) intentionally left unchecked — verified during tomorrow's live call after push+clone.

AC#6 verified: real Meet call end-to-end — captions captured by the bookmarklet appeared live in the meeting page.
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
<!-- DOD:END -->
