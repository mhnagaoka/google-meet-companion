---
id: DRAFT-004
title: Como o processo (task/branch/evidência) se adapta à delegação de implementação
status: Draft
assignee: []
created_date: '2026-07-27 14:12'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Objetivo

Preservar o contexto da discussão sobre delegar a implementação a um subagente (ferramenta Agent, Claude) ou a um agente externo (ex.: `opencode run` com Kimi/Qwen), à luz das regras endurecidas nas GMC-022 (evidência-por-AC) e GMC-023 (gatilho-de-branch). Não é trabalho definido ainda — é registro pra discutir/decidir depois.

## Princípio central

Delegar move a DIGITAÇÃO, não a RESPONSABILIDADE. O orquestrador (Claude principal) continua dono da verdade da task. O auto-relato do delegado ('testes passam, ACs cumpridos') é INPUT pra verificação, nunca a verificação — é a GMC-022 um nível acima (n=0-disfarçado-de-verde com um intermediário no meio).

## Divisão de trabalho proposta

- Eu: gate delegar-ou-não (longo-mas-raso→delega; curto-ou-profundo→eu); criar task (main, GMC-023); criar branch + In Progress e entregar a branch pronta; VERIFICAR (git reality, re-rodar checks, nomear evidência por-AC); checar ACs; merge --no-ff; Done; métricas.
- Delegado: só implementar no meio, na branch, rodar checks, self-report.
- Nunca delego: criar task, verificar AC comportamental, marcar Done — as três coisas que GMC-020/022/023 mostraram ser as mais fáceis de fingir.

## Onde as regras novas mordem

- GMC-022: AC comportamental/empírico NÃO é quitável por um delegado com unit-verde (seria a GMC-020 terceirizada). Ou eu rodo o sistema real, ou exijo o artefato de runtime (transcrição, método, n) e trato com honestidade método+n+regressão.
- GMC-023: mantenho o setup de task+branch comigo; a GMC-013 vazou por ordem-de-branch, e o texto novo é matizado — um delegado cold com branch pronta não precisa tocar nessa nuance.

## Infra já existente (verificada)

- AGENTS.md -> CLAUDE.md (symlink): opencode lê AGENTS.md e recebe o CLAUDE.md inteiro, incl. GMC-022/023. Propagação confirmada n=1 (GMC-015 delegada ao Kimi passou limpa após o fix da GMC-013).
- Runbook de delegação existe só na memória do Claude, não no repo.

## Pontos em aberto pra discutir depois

1. Subagente via ferramenta Agent (Claude, cold): INCERTO se o harness injeta o CLAUDE.md completo no contexto dele. Se não, ele desconhece 022/023 e vira a armadilha da GMC-013. Testar barato ou passar regras explícitas no prompt antes de confiar o ciclo a ele.
2. Promover o runbook de delegação (hoje só na memória) para um doc de backlog (backlog/docs/), pra virar patrimônio do projeto legível pelo delegado. YAGNI até delegar com frequência que justifique.
3. Talvez registrar GMC-022/023 como decisions (backlog/decisions/) — conversa separada.
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
