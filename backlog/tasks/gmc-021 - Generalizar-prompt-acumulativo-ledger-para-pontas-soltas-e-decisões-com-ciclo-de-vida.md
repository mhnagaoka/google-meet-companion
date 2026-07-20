---
id: GMC-021
title: >-
  Generalizar prompt acumulativo (ledger) para pontas soltas e decisões, com
  ciclo de vida
status: To Do
assignee: []
created_date: '2026-07-20 19:37'
labels: []
dependencies:
  - GMC-020
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contexto

Generalização do GMC-020 (que cobre só a seção 5, perguntas) para os demais casos ledger da análise. Discussão concluiu que as seções se dividem em duas categorias:

- Seções-estado (re-derivar do zero, refletem o AGORA): 1 (tópicos+tempo), 2 (alerta de tempo). NÃO acumulam — acumular criaria alerta zumbi. Fora de escopo.
- Seções-ledger (itens têm ciclo de vida aberto→resolvido/substituído): 3 (contradições/pontas soltas), 4 (decisões e ações), 5 (perguntas, já em GMC-020).

Fato-chave: a transcrição inteira é enviada a cada rodada (writeTranscript→render, server.js:252), então acumular NÃO recupera input perdido — blinda contra viés de recência numa re-derivação que perde itens antigos ainda em aberto por deriva de atenção.

Tradeoff a controlar: re-derivação é stateless e auto-corretiva (alucinação some sozinha); ledger acumulativo é stateful e persiste erro até ser podado. Por isso o ciclo de vida com poda é parte essencial, não opcional.

## Objetivo

Reescrever PROMPT/PRIOR (server.js:45-59) para que pontas soltas (3) e decisões/ações (4) persistam entre rodadas com ciclo de vida explícito, e dissolver a seção 6 em marcadores de status inline.

## Abordagem (decidir na execução)

- Prestação de contas de status no formato de saída (o formato força a reavaliação, em vez de uma instrução solta 'reavalie'): cada item carregado marcado como novo / mantido / resolvido / substituído / removido.
- Assimetria: default = manter; remoção só por razão nomeada (resolvido, substituído, insustentável). Evita reintroduzir a perda por recência.
- Resolvido = mostra marcador por uma rodada e envelhece; retratado-como-ruído = remove silenciosamente (não polui o painel com log de erro).
- Flag tentativo/baixa-confiança para conter o lixo de início de reunião (inferência rala falha o teste 'ainda se sustenta na transcrição inteira?' conforme dado real acumula).
- Estabilidade de texto: item carregado mantém a redação; só o status muda (mesmo motivo pelo qual o PRIOR hoje fixa nomes de tópicos).
- Seção 6 'Desde a última análise' dissolve nos marcadores inline de 3/4/5.

## Relação com outros tickets

- Depende de GMC-020 (fatia das perguntas / prova de conceito do carry-forward). A segunda passada aqui unifica o mecanismo introduzido lá.
- Validação de comportamento acumulativo via replay de reunião real (dev/replay.js, loop multi-rodada). Latência é assunto separado (GMC-019).

## Fora de escopo

- Seções-estado 1 e 2 continuam re-derivação pura.
- Split de chamadas paralelas (pendente da medição de latência, GMC-019).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pontas soltas (3) ainda não resolvidas persistem entre rodadas até serem resolvidas, substituídas ou consideradas insustentáveis
- [ ] #2 Decisões e ações (4) persistem entre rodadas; ações podem ser marcadas como concluídas e decisões como substituídas
- [ ] #3 Cada item carregado tem status explícito (novo/mantido/resolvido/substituído); remoção exige razão nomeada, com default = manter
- [ ] #4 Há mecanismo de poda para conter compounding-drift (itens insustentáveis/baixa-confiança saem), e itens tentativos de início de reunião são distinguíveis
- [ ] #5 Item carregado mantém a redação entre rodadas; apenas o status muda
- [ ] #6 A seção 6 é dissolvida em marcadores de status inline nas seções-ledger
- [ ] #7 Seções-estado 1 e 2 permanecem re-derivação pura, sem acumulação
- [ ] #8 Mudança é apenas no prompt (PROMPT/PRIOR em server.js), sem novo código de estado/parsing
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
