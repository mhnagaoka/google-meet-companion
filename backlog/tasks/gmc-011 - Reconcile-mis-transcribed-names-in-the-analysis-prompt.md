---
id: GMC-011
title: Reconcile mis-transcribed names in the analysis prompt
status: Done
assignee:
  - '@claude'
created_date: '2026-07-12 14:55'
updated_date: '2026-09-03 13:06'
labels: []
dependencies: []
references:
  - GMC-010
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GMC-010's real-transcript evaluation showed Meet's ASR corrupts person names inside speech while speaker labels stay correct (they come from the DOM, not ASR): 'Mal' for 'Mau' (Mauricio), 'Damari' for 'da Mari' (Mariana). The analysis inherited these ('Alan/Damari' as if Damari were an entity). Add a prompt instruction telling the model to reconcile names mentioned inside utterances against the speaker labels, considering nicknames and diminutives (Mari = Mariana, Mau = Mauricio), and to keep the transcribed form when the match is uncertain (clients or people outside the call must not be force-mapped).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PROMPT instructs the model that names inside speech may be ASR-corrupted and should be reconciled against speaker-label names, with an uncertainty escape hatch
- [x] #2 Re-running the analysis over the GMC-010 transcript resolves 'Damari' to Mariana and 'Mal' to Mauricio in the output
- [x] #3 PROMPT instructs the model not to invent specifics absent from the transcript (GMC-010 round 2: DeepSeek fabricated 'S3' for a GCS bucket and 'banco de dados' for the new production environment)
- [x] #4 Re-running over the GMC-010 transcript produces no fabricated technology names (no 'S3')
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [x] #1 No linting errors
- [x] #2 All unit tests passing
- [x] #3 Code is reviewed by ponytail
- [x] #4 PRD and docs updated if the implementation deviated from them (or the deviation reverted)
- [x] #5 Changes are committed on a branch named after the task id (e.g. gmc-999)
- [x] #6 Branch merged to main with git merge --no-ff
<!-- DOD:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Adicionar duas frases ao PROMPT (server.js): (a) nomes de pessoas DENTRO da fala podem estar corrompidos pelo ASR — reconciliar contra os rótulos de falante, considerando apelidos/diminutivos, mantendo a forma transcrita quando a correspondência for incerta; (b) não inventar especificidade — só usar termos presentes na transcrição.
2. Rodar lint + testes (mudança é string; espera-se verde sem alterar server.test.js).
3. Validação empírica (AC #2/#4) via frozen-prefix (dev/README.md): pré-semear meetings/<data>-<code>/transcript.txt com as 692 linhas filtradas da transcrição real da GMC-010, subir o servidor, disparar 1 caption POST e ler analysis.txt. Timestamps reais preservados, 1 chamada LLM por rodada.
4. Repetir a validação em dois backends (claude/sonnet e go-qwen/qwen3.8-flash) — n=2, AC comportamental, conforme a nota da GMC-010 de que o efeito varia por modelo.
5. Conferir na saída: 'Damari' -> Mariana, 'Mal' -> Mauricio, ausência de 'S3'. Registrar método, n e mecanismo de regressão nas notas.
6. Merge --no-ff na main, depois Done.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Scope addition agreed with user (2026-07-12): besides name reconciliation, the prompt must also guard against fabricated specificity, found in GMC-010's opencode/deepseek round. Note from that round: DeepSeek resolved 'Damari' -> Mariana unprompted while Sonnet half-failed — the reconciliation instruction may matter more for some models than others; validate against both CLIs.

=== Validação empírica (2026-09-03, branch gmc-011) ===

Protocolo: controle x tratamento, única variável = o PROMPT. Frozen-prefix (dev/README.md): as mesmas 692 linhas 'Speaker: text' da transcrição real da GMC-010 (/home/mau/Downloads/2026-07-10-daily-dark-app.md) pré-semeadas como transcript.txt, timestamps sintéticos distribuídos em 30 min, 1 caption POST dispara 1 tick único (sem análise anterior). Harness descartável fora do repo (scratchpad/run.mjs, importa createApp com dir/llm/every); controle roda o server.js da main via git worktree. Nada de reunião entrou no git.

4 rodadas: ctl/trt x go-qwen(qwen3.8-flash) e ctl/trt x claude(sonnet, effort low).

RESULTADO 1 — reconciliação de nomes ('Damari'):
- ctl-qwen: 3 ocorrências de 'Damari' tratado como entidade ('Conflito Wizard vs. Damari', 'o de Mariana (Damari)').
- ctl-clau: 3 ocorrências, idem ('conflito Wizard vs Damari', 'ticket de Mariana (Damari), que voltou para dev').
- trt-qwen: 0 ocorrências — virou 'Alan & Mariana: empilhar as branches (Wizard + Dark)'.
- trt-clau: 0 ocorrências — virou 'Conflito de PR Allan x Mariana (Wizard/Dark)'.
Efeito diferencial limpo nos dois backends: 3 -> 0. Os tratamentos não só apagaram o nome fantasma como resolveram o referente certo (o ticket é da Mariana, projeto Dark).

RESULTADO 2 — 'Mal' -> Mauricio:
'Mal' não aparece em nenhuma das 4 saídas, inclusive nos controles. Os itens onde a transcrição diz 'Mal' (serviço de chat, sandbox/homologação) são atribuídos a Mauricio nas 4 rodadas. Ou seja: este caso já era resolvido pelo prompt antigo neste setup; o ganho mensurável da instrução está no 'Damari', não no 'Mal'. (Na GMC-010 o sonnet falhou pela metade — a diferença provável é o frozen-prefix, que entrega a transcrição inteira num tick só em vez de fatiada pelo replay.)

RESULTADO 3 — anti-fabricação:
- 'S3' não aparece em nenhuma das 4 saídas (nem nos controles). AC #4 satisfeito, mas sem contraste: a fabricação da GMC-010 era do deepseek-v4-flash, modelo que não está mais em uso.
- A fabricação da GMC-010 REAPARECEU em outra forma e foi barrada: ctl-qwen escreveu 'Dênis continua trabalhando no novo ambiente de produção e banco de dados' — 'banco de dados' não existe na transcrição. trt-qwen escreveu 'Denis: Novo ambiente de produção/IP definitivo; Jeff cuidando do banco', e tanto 'Jeff' quanto 'banco' são tokens literais da transcrição (linha 779: 'O Jeff ele pegou o banco de obra'). Ou seja, o controle expandiu um token truncado numa tecnologia específica; o tratamento parou no que foi dito.
- Varredura de tecnologias inventadas (s3|gcs|bucket|banco de dados|storage|aws|firebase|postgres|kubernetes) nas 4 saídas: só 'bucket' (presente na transcrição) e o 'banco de dados' do controle.

Natureza da evidência: AC #2 e #4 são comportamentais, não automatizáveis — a saída é de LLM. n=2 backends x 1 rodada cada, não-determinístico. Mecanismo de regressão: governado por prompt — pode quebrar sem nenhum teste ficar vermelho (um upgrade de modelo, ou uma edição no PROMPT, bastam). Para re-verificar, repetir o protocolo acima.

Qualidade geral não regrediu: as 6 seções continuam bem formadas nas duas saídas de tratamento (trt-clau com 4 tópicos cronometrados, 3 pontas soltas, 7 ações, 5 perguntas).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Duas instruções adicionadas ao PROMPT (server.js, +9 linhas, nenhum código novo): (a) nomes ditos dentro da fala podem estar corrompidos pelo ASR enquanto os rótulos de falante não, então reconcilie-os contra os rótulos aceitando apelidos/diminutivos, mantendo a forma transcrita quando a correspondência for incerta (para não forçar clientes e pessoas de fora da call em cima de um participante); (b) não inventar especificidade — só termos, tecnologias e números presentes na transcrição.

Verificação: controle x tratamento sobre as mesmas 692 linhas da transcrição real da GMC-010 via frozen-prefix, um tick por rodada, 2 backends (go-qwen/qwen3.8-flash e claude/sonnet-low), controle rodando o server.js da main num git worktree. 'Damari' caiu de 3 ocorrências para 0 nos DOIS backends, resolvido para o par certo (PR da Mariana / projeto Dark) — AC #2. 'Mal' não aparece em nenhuma saída e os itens correspondentes vão para Mauricio nas 4 rodadas, mas isso já valia no controle, então o ganho medido está no 'Damari'. Nenhum 'S3' em nenhuma rodada (AC #4), e a fabricação da GMC-010 reapareceu noutra forma e foi barrada: o controle go-qwen escreveu 'banco de dados' (ausente da transcrição) onde o tratamento escreveu 'Jeff cuidando do banco', ambos tokens literais da fala. AC #1 e #3 são estáticos, provados pelo diff. AC #2 e #4 são comportamentais: n=2 backends, não-determinístico, governados por prompt — podem regredir sem nenhum teste ficar vermelho.

Biome check limpo em server.js, 18/18 testes passando (nenhum precisou mudar: a alteração é conteúdo de string, não estrutura). Nada de reunião entrou no git — harness e saídas ficaram no scratchpad.
<!-- SECTION:FINAL_SUMMARY:END -->
