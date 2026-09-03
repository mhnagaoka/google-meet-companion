---
id: GMC-011
title: Reconcile mis-transcribed names in the analysis prompt
status: In Progress
assignee:
  - '@claude'
created_date: '2026-07-12 14:55'
updated_date: '2026-09-03 12:53'
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
- [ ] #3 PROMPT instructs the model not to invent specifics absent from the transcript (GMC-010 round 2: DeepSeek fabricated 'S3' for a GCS bucket and 'banco de dados' for the new production environment)
- [ ] #4 Re-running over the GMC-010 transcript produces no fabricated technology names (no 'S3')
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adicionar duas frases ao PROMPT (server.js): (a) nomes de pessoas DENTRO da fala podem estar corrompidos pelo ASR — reconciliar contra os rótulos de falante, considerando apelidos/diminutivos, mantendo a forma transcrita quando a correspondência for incerta; (b) não inventar especificidade — só usar termos presentes na transcrição.
2. Rodar lint + testes (mudança é string; espera-se verde sem alterar server.test.js).
3. Validação empírica (AC #2/#4) via frozen-prefix (dev/README.md): pré-semear meetings/<data>-<code>/transcript.txt com as 692 linhas filtradas da transcrição real da GMC-010, subir o servidor, disparar 1 caption POST e ler analysis.txt. Timestamps reais preservados, 1 chamada LLM por rodada.
4. Repetir a validação em dois backends (claude/sonnet e go-qwen/qwen3.8-flash) — n=2, AC comportamental, conforme a nota da GMC-010 de que o efeito varia por modelo.
5. Conferir na saída: 'Damari' -> Mariana, 'Mal' -> Mauricio, ausência de 'S3'. Registrar método, n e mecanismo de regressão nas notas.
6. Merge --no-ff na main, depois Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope addition agreed with user (2026-07-12): besides name reconciliation, the prompt must also guard against fabricated specificity, found in GMC-010's opencode/deepseek round. Note from that round: DeepSeek resolved 'Damari' -> Mariana unprompted while Sonnet half-failed — the reconciliation instruction may matter more for some models than others; validate against both CLIs.
<!-- SECTION:NOTES:END -->
