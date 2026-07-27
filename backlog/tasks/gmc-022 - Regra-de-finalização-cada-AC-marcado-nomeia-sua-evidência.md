---
id: GMC-022
title: 'Regra de finalização: cada AC marcado nomeia sua evidência'
status: To Do
assignee: []
created_date: '2026-07-27 13:34'
labels: []
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contexto

Episódio GMC-020: dois ACs comportamentais (#1 perguntas em aberto reaparecem; #2 novas distinguíveis das carregadas) foram marcados como cumpridos usando 'os 18 testes passam' como prova — mas os testes cobrem só a mecânica, não o conteúdo que o LLM gera em runtime. n=0 disfarçado de verde. Só foi pego porque o usuário cobrou a evidência.

## Raiz

O guia de finalização pede 'verify all acceptance criteria' mas não define o que 'verificar' significa em termos de evidência, e lista 'ACs marcados' e 'testes passam' como itens separados do DoD — o que convida a substituir 'este AC é verdadeiro?' por 'a suíte está verde?'. Falta forçar o objeto do verbo: verificado COM O QUÊ.

## Mudança

Adicionar uma seção curta ao CLAUDE.md: ao marcar um AC, nomear a evidência específica DAQUELE AC. Verde global da suíte não conta como evidência de AC comportamental. Distinguir três espécies de AC (estático/prova é o diff; automatizável/prova é um teste; comportamental-empírico/prova é observação registrada com método+n). Evidência empírica registra n e mecanismo de regressão; n=0 disfarçado de verde é proibido.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CLAUDE.md contém uma seção nova que exige nomear a evidência específica de cada AC ao marcá-lo, afirma que o verde global da suíte não vale como evidência de AC comportamental, distingue AC estático/automatizável/empírico, e manda evidência empírica registrar método+n — com redação acordada com o usuário
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
