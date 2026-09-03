---
id: GMC-026
title: Trocar o modelo da estratégia go-qwen para qwen3.8-flash
status: To Do
assignee: []
created_date: '2026-09-03 12:43'
labels: []
dependencies:
  - GMC-025
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A GMC-025 rodou o mesmo transcript real por quatro modelos da zen API em lockstep e conferiu as afirmações por grep contra a transcrição. O qwen3.7-plus, fixado hoje em CLIS['go-qwen'], foi o único com fabricação verificada — chama de 'Bucket S3' o que a transcrição só chama de 'bucket', sem fornecedor citado em lugar nenhum — e ainda vazou uma pergunta sugerida em inglês apesar do 'Responda em português' do PROMPT. O qwen3.8-flash cobriu mais matéria real da reunião (churn enterprise TM/XP, Eval/Golden Set, 'Mi off / banco de horas') sem fabricar nada nos itens checados. A única vantagem do qwen3.7-plus era reconciliar 'Damari' -> Mariana, que é alvo da GMC-011 e é trabalho de prompt, não de modelo. Usuário adjudicou a troca.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLIS['go-qwen'].model é qwen3.8-flash
- [ ] #2 Os testes existentes do caminho go-qwen continuam passando sem depender do nome do modelo antigo
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
