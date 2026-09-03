---
id: GMC-026
title: Trocar o modelo da estratégia go-qwen para qwen3.8-flash
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-03 12:43'
updated_date: '2026-09-03 12:45'
labels: []
dependencies:
  - GMC-025
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A GMC-025 rodou o mesmo transcript real por quatro modelos da zen API em lockstep e conferiu as afirmações por grep contra a transcrição. O qwen3.7-plus, fixado hoje em CLIS['go-qwen'], foi o único com fabricação verificada — chama de 'Bucket S3' o que a transcrição só chama de 'bucket', sem fornecedor citado em lugar nenhum — e ainda vazou uma pergunta sugerida em inglês apesar do 'Responda em português' do PROMPT. O qwen3.8-flash cobriu mais matéria real da reunião (churn enterprise TM/XP, Eval/Golden Set, 'Mi off / banco de horas') sem fabricar nada nos itens checados. A única vantagem do qwen3.7-plus era reconciliar 'Damari' -> Mariana, que é alvo da GMC-011 e é trabalho de prompt, não de modelo. Usuário adjudicou a troca.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 CLIS['go-qwen'].model é qwen3.8-flash
- [x] #2 Os testes existentes do caminho go-qwen continuam passando sem depender do nome do modelo antigo
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [ ] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Trocar o model id em CLIS['go-qwen'] de qwen3.7-plus para qwen3.8-flash (server.js:26) — uma linha
2. Atualizar as duas menções em docs (README.md:17 e docs/PRD.md:315), que citam o modelo pelo nome
3. Não mexer em server.test.js: os testes do caminho go-qwen montam o próprio objeto llm e afirmam o pass-through do model id, sem importar CLIS — já são independentes do nome
4. npx biome check . e npm test
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Diff de três linhas: server.js:28 (o model id), README.md:17 e docs/PRD.md:315 (as duas menções ao modelo pelo nome, que passariam a mentir sobre o default).

server.test.js não foi tocado de propósito: os dois testes do caminho go-qwen montam o próprio objeto llm e afirmam que o model id chega no corpo da requisição — testam o pass-through, não o default, e por isso não importam CLIS. A string "qwen3.7-plus" que sobra lá é fixture, definida duas linhas acima da própria asserção.

Smoke test do caminho default (o que a GMC-025 não cobriu, já que a avaliação usou um lançador com llm injetado): PORT=8751 ANALYZE_EVERY=5 node server.js go-qwen, um POST de legenda -> 204, e /state devolveu análise gerada em ~25s. Confirma que a troca funciona pelo caminho de produção, não só pelo harness.

Observação para follow-up: o preâmbulo meta previsto na GMC-025 apareceu no smoke ("Aqui está a análise da transcrição parcial:"). É cosmético e vive na UI; tratável com uma linha no PROMPT.
<!-- SECTION:NOTES:END -->
