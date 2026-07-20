---
id: DRAFT-004
title: Persistir perguntas sugeridas ainda sem resposta entre rodadas de análise
status: Draft
assignee: []
created_date: '2026-07-20 19:12'
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
