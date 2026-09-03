---
id: DRAFT-005
title: Suprimir preâmbulo meta na saída da análise
status: Draft
assignee: []
created_date: '2026-09-03 12:45'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
O qwen3.8-flash, agora o modelo default de go-qwen (GMC-026), abre a resposta com uma frase de apresentação — 'Aqui está a análise atualizada da reunião...' / 'Aqui está a análise da transcrição parcial:' — observada tanto nas três rodadas da GMC-025 quanto no smoke test da GMC-026. O painel de análise mostra a saída crua, então essa linha ocupa o topo da tela sem informar nada, num contexto em que o usuário está lendo de relance durante uma reunião ao vivo. O PROMPT hoje diz 'Responda em português, conciso, em tópicos' mas não proíbe frase de abertura. Vale decidir a redação da instrução e se ela é genérica o bastante para não penalizar os outros modelos de CLIS, que não têm esse tique.
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
