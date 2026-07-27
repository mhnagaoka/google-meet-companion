---
id: GMC-023
title: >-
  Corrigir gatilho de branching: branch antes de iniciar o trabalho, não antes
  de criar a task
status: In Progress
assignee:
  - '@mau'
created_date: '2026-07-27 13:52'
updated_date: '2026-07-27 13:54'
labels: []
dependencies: []
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contexto

Inconsistência observada: o commit de criação de 7 das últimas 8 tasks caiu na main, mas o gmc-022 caiu na branch — porque a seção 'Branching' do CLAUDE.md manda branchar antes do 'primeiro backlog edit, incluindo o create'.

## Raiz

A regra funde dois eventos distintos: REGISTRAR a demanda (criar a task) e INICIAR o trabalho (criar a branch). Consequências de forçar branch-antes-do-create:
- Galinha-e-ovo: a branch se chama gmc-NNN, mas o id é atribuído pelo create — obriga a adivinhar o próximo id (foi o que aconteceu no gmc-022).
- Contradição interna: a seção 'Findings During Execution' já manda criar uma task/draft durante o trabalho em outra (ex.: gmc-021 detectado durante gmc-020, nascendo na branch gmc-020). A seção 'Branching' proíbe isso ao pé da letra. As duas brigam.

Premissa técnica confirmada no config (remote_operations + check_active_branches + active_branch_days:90): o backlog.md consolida tasks de todas as branches ativas, então task criada numa branch NÃO fica invisível até o merge.

## Mudança

Reformular a seção 'Branching': o gatilho de criar a branch passa a ser 'antes de setar In Progress / antes do primeiro commit de código', não 'antes do primeiro backlog edit'. Onde o create da task cai é onde a demanda nasceu: demanda fria na main (id nasce ali, aí branch com o id em mãos); demanda detectada durante outra task pode nascer na branch em curso (aponta pra Findings During Execution). Fim do fluxo (merge --no-ff, Done na main) inalterado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Seção 'Branching' do CLAUDE.md reformulada de modo que: (a) o gatilho de criar a branch é 'antes de In Progress / primeiro commit de código', não 'antes do primeiro backlog edit'; (b) reconhece explicitamente que uma task detectada durante o trabalho em outra pode ser criada na branch em curso, alinhado com 'Findings During Execution'; (c) mantém merge --no-ff e Done-na-main inalterados — com redação acordada com o usuário
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #1 — evidência: diff da seção 'Branching' em CLAUDE.md (commit bfe1beb) + aprovação explícita da redação pelo usuário nesta sessão. AC estático: prova é o texto acordado, não um teste. DoD #1 (lint): biome ignora markdown, sem escopo. DoD #2: 18/18 passando, intactos (só-de-docs).
<!-- SECTION:NOTES:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
