---
id: GMC-022
title: 'Regra de finalização: cada AC marcado nomeia sua evidência'
status: Done
assignee:
  - '@mau'
created_date: '2026-07-27 13:34'
updated_date: '2026-07-27 13:40'
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
- [x] #1 CLAUDE.md contém uma seção nova que exige nomear a evidência específica de cada AC ao marcá-lo, afirma que o verde global da suíte não vale como evidência de AC comportamental, distingue AC estático/automatizável/empírico, e manda evidência empírica registrar método+n — com redação acordada com o usuário
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
AC #1 — evidência: diff de CLAUDE.md (seção 'Marking acceptance criteria', commit 30c73d8) + aprovação explícita da redação pelo usuário nesta sessão. AC de espécie estática: a prova é o texto acordado, não um teste. DoD #1 (lint): biome ignora markdown, sem escopo. DoD #2 (testes): 18/18 passando, intactos — mudança só-de-docs não toca código; rodado como fato, não como prova do AC.

Eficácia (hipótese, NÃO é AC): replay retrospectivo contra GMC-020 — a regra exige nomear evidência por-AC; #1/#2 do GMC-020 não tinham nenhuma, então o mapeamento 'qual teste cobre qual AC' falha e o check seria bloqueado. n=1 retrospectivo, determinístico, custo zero. Isso prova que a regra DISCRIMINA a falha que mira, não que muda comportamento futuro — compliance futura é observada nas próximas tasks com AC comportamental, não é gated aqui. Se 'o gate funciona' fosse um AC, falharia o próprio teste no commit (n=0 no runtime): é por isso que ficou como nota, não como critério.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Adicionada seção 'Marking acceptance criteria' ao CLAUDE.md: check de AC exige nomear a evidência específica daquele AC; verde global não vale para AC comportamental; distinção estático/automatizável/empírico; empírico registra método+n+mecanismo de regressão. Verificado pelo diff + aprovação da redação pelo usuário. Eficácia validada por replay retrospectivo contra GMC-020 (n=1).
<!-- SECTION:FINAL_SUMMARY:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [x] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->
