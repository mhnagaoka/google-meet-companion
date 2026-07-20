---
id: GMC-019
title: Instrumentar latência da chamada de análise (analyze)
status: To Do
assignee: []
created_date: '2026-07-20 19:31'
labels: []
dependencies: []
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contexto

Discussão sobre dividir a análise em chamadas paralelas por seção esbarra numa incógnita: não sabemos a latência real da chamada de análise atual. Sem esse número, o argumento de 'mais rápido em paralelo' é especulativo — o tick roda a cada 120s (server.js:69) e s.inflight (server.js:275) só faz o tick pular se a chamada ainda roda, então latência hoje vira análise mais velha, não erro. Só faz sentido considerar split se a chamada estiver perto de estourar os 120s.

Nota importante já apurada na discussão: dividir o prompt NÃO encolhe o input — a transcrição inteira (não as instruções) domina cada chamada, então N chamadas paralelas mandam a transcrição N vezes. O único ganho de velocidade possível é paralelismo de output, pago com N× custo de input. Medir a latência da chamada única é o que decide se vale investigar.

## Objetivo

Instrumentar analyze() (server.js:273) para registrar, por chamada: duração wall-clock da chamada LLM, tamanho da transcrição de entrada, tamanho do output. Permitir traçar latência × tamanho da transcrição.

## Abordagem sugerida

- performance.now() em volta da chamada LLM em analyze(), logando duração + len(transcript) + len(output).
- Atrás de um env flag (ex.: ANALYZE_TIMING) ou stderr simples — é instrumentação de dev, não feature de produto.
- Medir via frozen-prefix (pré-semear transcript.txt em 3-4 tamanhos e chamar analyze) para curva limpa latência × tamanho, sem o pacing comprimido do replay. dev/replay.js e dev/README documentam os caminhos.

## Fora de escopo

- Não implementar split paralelo nem mudanças de prompt (ver DRAFT-004 e a discussão de seções-ledger).
- Não virar teste de CI — chamadas LLM são reais, custam e são não-determinísticas; isto é ferramenta de experimento.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 analyze() registra duração da chamada LLM, tamanho da transcrição e tamanho do output por chamada
- [ ] #2 A instrumentação fica atrás de um flag/env e não altera o comportamento de produção quando desligada
- [ ] #3 É possível obter a curva latência × tamanho da transcrição via frozen-prefix em múltiplos tamanhos
- [ ] #4 Nenhuma mudança de prompt ou de arquitetura de chamada (split) é incluída nesta task
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
