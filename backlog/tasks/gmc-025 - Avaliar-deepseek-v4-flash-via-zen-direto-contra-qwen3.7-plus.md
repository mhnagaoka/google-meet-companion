---
id: GMC-025
title: Avaliar deepseek-v4-flash via zen direto contra qwen3.7-plus
status: To Do
assignee: []
created_date: '2026-09-03 12:19'
labels: []
dependencies: []
references:
  - /home/mau/Downloads/2026-07-10-daily-dark-app.md
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A estratégia go-qwen (GMC-018) está fixada em qwen3.7-plus, escolhida sem comparação direta. Na GMC-010 o usuário, que participou da reunião, preferiu a análise do deepseek-v4-flash — mas aquela rodada passou pelo CLI do opencode, então qualidade do modelo e overhead do coding-agent ficaram misturados, e o prompt mudou desde então (GMC-020 acrescentou o carry-over de perguntas na seção 5). Roda-se o mesmo transcript real pelas duas rotas de API direta, sob o prompt atual, para decidir se o modelo fixado em CLIS deve mudar. Privacidade: o transcript fica fora do repo (~/Downloads) e os artefatos gerados ficam em meetings/, que é gitignored.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 As duas rodadas usam o mesmo transcript filtrado e a mesma cadência de análise, mudando apenas o model id da zen API
- [ ] #2 Cada rodada completa pelo menos duas análises, exercitando injeção da análise anterior e a seção 6
- [ ] #3 As análises são avaliadas contra as seis seções do PROMPT e as diferenças ficam registradas nas notas da task
- [ ] #4 A recomendação sobre manter ou trocar o model id de CLIS['go-qwen'] fica explícita nas notas
- [ ] #5 Nem o transcript nem os artefatos de reunião entram no git
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
