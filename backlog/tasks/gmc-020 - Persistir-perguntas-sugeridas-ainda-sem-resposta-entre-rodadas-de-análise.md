---
id: GMC-020
title: Persistir perguntas sugeridas ainda sem resposta entre rodadas de análise
status: In Progress
assignee:
  - '@mau'
created_date: '2026-07-20 19:13'
updated_date: '2026-07-27 12:56'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

O analisador (server.js) às vezes sugere perguntas muito boas na seção 5 ('Perguntas sugeridas'), mas elas se perdem nas rodadas seguintes mesmo quando ainda não foram respondidas na reunião.

Causa raiz no prompt:
- PROMPT (server.js:55): a seção 5 pede perguntas que 'You' poderia fazer *agora* — ancorada no momento presente, gera viés de recência.
- PRIOR (server.js:58-59): instrui a usar a análise anterior *só* para consistência de nomes de tópicos e para calcular a seção 6, re-derivando todo o resto da transcrição. Isso proíbe explicitamente carregar perguntas anteriores para a seção 5.

Resultado: as perguntas sugeridas são efêmeras por construção. A ponta solta que as gerou é rastreada (seções 3 e 6), mas a *pergunta em si* não persiste; quando a conversa avança, perguntas ainda em aberto somem.

## Objetivo

Fazer perguntas sugeridas ainda não respondidas persistirem entre rodadas, marcando quais são novas.

## Abordagem (decidir na execução)

Ajuste apenas de prompt, sem código novo. Opções discutidas:
1. Carry-forward na seção 5: incluir perguntas ainda em aberto de rodadas anteriores, marcando as novas.
2. Nova sub-lista na seção 6: 'perguntas que continuam sem resposta'.

Em ambos os casos é preciso abrir exceção no texto do PRIOR, que hoje manda re-derivar tudo além de nomes/seção 6.

Nota: discussão posterior sugeriu generalizar isto para um ciclo de vida das seções-ledger (3/4/5) com marcação de status inline e poda — ver a linha de trabalho relacionada. Esta task cobre o recorte das perguntas.
<!-- SECTION:DESCRIPTION:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [ ] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [ ] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Perguntas sugeridas ainda sem resposta reaparecem em rodadas seguintes até serem respondidas ou perderem relevância
- [x] #2 Perguntas novas na rodada atual ficam distinguíveis das carregadas de rodadas anteriores
- [x] #3 O texto do PRIOR deixa de proibir o uso da análise anterior para perguntas sugeridas
- [x] #4 Mudança é apenas no prompt (PROMPT/PRIOR em server.js), sem novo código de estado/parsing
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prompt-only. Seção 5 do PROMPT agora manda carregar perguntas ainda em aberto da análise anterior e marcar novas com '(nova)'. PRIOR deixou de proibir usar a análise anterior para perguntas (antes: 're-derive todo o resto'). Sem código novo. 18/18 testes passam, biome limpo.
<!-- SECTION:NOTES:END -->
