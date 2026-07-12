---
id: GMC-006
title: Node.js project setup with Biome
status: Done
assignee:
  - '@claude'
created_date: '2026-07-12 04:15'
updated_date: '2026-07-12 04:30'
labels: []
dependencies: []
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bootstrap the repo so every subsequent task lands on working tooling: package.json and Biome (linting + formatting, replacing eslint/prettier). Runtime code stays stdlib-only per the PRD; @biomejs/biome is a devDependency. CI is deliberately out of scope for now.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json exists: private, type module, engines pinning the Node version floor, npm start running node server.js
- [x] #2 @biomejs/biome (2.x) is the only dependency; biome.json checked in; npx biome check . passes on the repo
- [x] #3 npm run check (biome check --write) works as the local lint+format entrypoint
- [x] #4 .gitignore covers node_modules/ and meetings/
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. package.json: private, type module, engines >=24, scripts start/check
2. npm i -D @biomejs/biome@2
3. biome.json via biome init, minimal tweaks
4. .gitignore += meetings/
5. npx biome check . passes (fix or scope out dev/ probes if needed)
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Node floor >=24 (current LTS; nothing pinned in PRD/ADRs, dev machine on 26.4.0). Biome defaults kept (tabs, double quotes, recommended rules); npm run check reformatted package.json and dev/caption-probe.js, plus one manual fix splitting an assignment-in-expression in the probe. No unit tests exist yet, so DoD#2 is vacuous. Ponytail review: diff is minimal, nothing to cut.

Post-completion user request: switched formatter to spaces and semicolons asNeeded; repo reformatted, biome check still passes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Bootstrapped Node tooling: package.json (private, type module, engines >=24, start/check scripts), @biomejs/biome ^2.5.3 as sole devDependency, default biome.json with git VCS integration, .gitignore now covers meetings/. Verified: npx biome check . passes clean.
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
<!-- DOD:END -->
