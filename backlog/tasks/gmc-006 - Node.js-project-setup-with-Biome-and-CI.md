---
id: GMC-006
title: Node.js project setup with Biome
status: To Do
assignee: []
created_date: '2026-07-12 04:15'
updated_date: '2026-07-12 04:20'
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
- [ ] #1 package.json exists: private, type module, engines pinning the Node version floor, npm start running node server.js
- [ ] #2 @biomejs/biome (2.x) is the only dependency; biome.json checked in; npx biome check . passes on the repo
- [ ] #3 npm run check (biome check --write) works as the local lint+format entrypoint
- [ ] #4 .gitignore covers node_modules/ and meetings/
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
<!-- DOD:END -->
