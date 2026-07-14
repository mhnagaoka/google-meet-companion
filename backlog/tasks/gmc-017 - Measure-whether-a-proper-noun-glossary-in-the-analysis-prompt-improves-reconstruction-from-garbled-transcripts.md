---
id: GMC-017
title: >-
  Measure whether a proper-noun glossary in the analysis prompt improves
  reconstruction from garbled transcripts
status: In Progress
assignee: []
created_date: '2026-07-14 15:44'
updated_date: '2026-07-14 15:54'
labels: []
dependencies: []
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Spike/experiment. The analysis PROMPT (server.js) tells the model captions may contain errors but gives no domain context. Question: does injecting a short glossary of org-specific proper nouns (project names, internal tools) into the prompt measurably improve the analysis when fed a garbled transcript? Prior runs showed the model already reconstructs generic jargon on its own, so the expected lever is proper-noun resolution and topic-name consistency, not domain framing. Likely outcome: marginal gain; branch probably NOT merged to main — the task documents the finding.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A control analysis exists: raw garbled transcript, current prompt, frozen-prefix (real timestamps), single run (no history)
- [ ] #2 A treatment analysis exists: same raw transcript + frozen-prefix, but with a proper-noun glossary added to PROMPT
- [ ] #3 The two analyses are diffed and the glossary's effect (name resolution, consistency, hallucinations) is documented in the task notes
- [ ] #4 Decision recorded: is the glossary worth making permanent (new task) or not (branch stays unmerged)
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
EXPERIMENTO CONCLUÍDO (branch gmc-017, provavelmente NÃO merged).

Setup: 4 análises via frozen-prefix (dev/README.md), servidor com llm=opencode, timestamps reais preservados. Todas em meetings/ (gitignored).
- ctl-orig-raw: texto CRU + prompt atual (sem glossário) — CONTROLE
- trt-glos-raw: texto CRU + prompt com glossário de nomes próprios — TRATAMENTO
- cor-rctd-abc / rpl-aaaa-bbb: runs auxiliares com transcrição corrigida (contexto anterior)

Glossário testado (adicionado ao PROMPT em server.js): Projetos internos Dark/Malte/Visto; Ferramentas Backlog.md/OpenCode/Claude Code/Codex/MCP.

RESULTADO (controle x tratamento, única variável = glossário):
- GANHO: corrigiu alucinação 'OpenAI'->'OpenCode' e surfou 'MCP' explicitamente. Ambos batem com entradas do glossário.
- SEM EFEITO: 'link da memória' (certo: 'limpa') e STT Vox/Whisper seguiram errados/omitidos nos dois — não são nomes do glossário.
- Diferenca no alerta de tempo (controle mais afiado) = variancia de run, nao efeito do glossario.

CONCLUSÃO: ganho real mas marginal e cirúrgico — glossário só FIXA os nomes próprios que lista, não melhora compreensão geral (o modelo já reconstrói o jargão sozinho a partir do texto cru). Custo: tokens por tick + superfície de config (onde guardar glossário por projeto).

DECISÃO PENDENTE (do usuário): não vale merge automático. Só promover a mudança permanente (nova task) se inconsistência/alucinação de nomes próprios virar dor recorrente. Servidor está rodando o código da branch (com glossário) — precisa voltar pro prompt de main ao encerrar.
<!-- SECTION:NOTES:END -->
