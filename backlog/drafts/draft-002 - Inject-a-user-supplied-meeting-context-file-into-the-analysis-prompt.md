---
id: DRAFT-002
title: Inject a user-supplied meeting context file into the analysis prompt
status: Draft
assignee: []
created_date: '2026-07-12 15:36'
labels: []
dependencies: []
references:
  - GMC-010
  - DRAFT-001
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ground the analysis in authoritative context to cut fabrications and resolve implicit references (tickets discussed via screen share are never named in captions). Mechanism: if a context file exists for the session (e.g. context.txt in the session dir or a configured path), analyze() injects it into the prompt with framing like 'contexto fornecido pelo usuário: tíquetes do sprint, participantes, glossário'. Content is user-produced (hand-written, jira CLI export, cron) — no JIRA integration in the companion. Scope guidance: active sprint only, id | title | status | assignee per ticket; a nickname/jargon glossary fits too (Mau = Mauricio, bucket = GCS). Validation: replay the GMC-010 transcript with a hand-written context.txt of the real board and check that section 4 cites ticket IDs and 'S3'-class fabrications drop. If this lands it likely subsumes DRAFT-001 (participant roster is just context-file content). Evidence: GMC-010 rounds showed groundless specifics get fabricated ('S3' for a GCS bucket) and topics stay vague without board context.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 No linting errors
- [ ] #2 All unit tests passing
- [ ] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
