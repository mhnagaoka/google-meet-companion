---
id: GMC-025
title: >-
  Avaliar deepseek-v4-flash, mimo-v2.5 e qwen3.8-flash contra qwen3.7-plus via
  zen direto
status: In Progress
assignee:
  - '@claude'
created_date: '2026-09-03 12:19'
updated_date: '2026-09-03 12:33'
labels: []
dependencies: []
references:
  - /home/mau/Downloads/2026-07-10-daily-dark-app.md
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A estratégia go-qwen (GMC-018) está fixada em qwen3.7-plus, escolhida sem comparação direta. Na GMC-010 o usuário, que participou da reunião, preferiu a análise do deepseek-v4-flash — mas aquela rodada passou pelo CLI do opencode, então qualidade do modelo e overhead do coding-agent ficaram misturados, e o prompt mudou desde então (GMC-020 acrescentou o carry-over de perguntas na seção 5). Roda-se o mesmo transcript real por quatro modelos da zen API (deepseek-v4-flash, mimo-v2.5, qwen3.8-flash e o qwen3.7-plus atual como controle), sob o prompt atual, para decidir se o modelo fixado em CLIS deve mudar. Privacidade: o transcript fica fora do repo (~/Downloads) e os artefatos gerados ficam em meetings/, que é gitignored.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 As quatro rodadas usam o mesmo transcript filtrado e a mesma cadência de análise, mudando apenas o model id da zen API
- [ ] #2 Cada rodada completa pelo menos duas análises, exercitando injeção da análise anterior e a seção 6
- [ ] #3 As análises são avaliadas contra as seis seções do PROMPT e as diferenças ficam registradas nas notas da task
- [ ] #4 A recomendação sobre manter ou trocar o model id de CLIS['go-qwen'] fica explícita nas notas
- [ ] #5 Nem o transcript nem os artefatos de reunião entram no git
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Filtrar o export: só linhas 'Speaker: text' vão para o scratchpad (descarta título/participantes), mesmo pré-processamento da GMC-010
2. Lançador descartável 'node -e' que chama createApp com { llm: { url, model, thinking } }, variando só o model id — sem tocar em CLIS
3. Quatro rodadas sequenciais, ANALYZE_EVERY=120, servidor em background com log no scratchpad, um meet code por modelo: deepseek-v4-flash (dsf-appd-ily), mimo-v2.5 (mim-appd-ily), qwen3.8-flash (q38-appd-ily), qwen3.7-plus controle (q37-appd-ily)
4. Em cada rodada: node dev/replay.js <filtrado> <code> 500 (~700 linhas => ~6 min => 3-4 ticks); checksum de analysis.txt a cada 20s para evidenciar ticks distintos
5. Comparar as quatro análises finais contra as seis seções do PROMPT; registrar diferenças e recomendação sobre CLIS['go-qwen'] nas notas
6. Sem mudança de código: DoD de branch/merge fica N/A como na GMC-010
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Protocolo: 692 linhas "Speaker: text" filtradas do export real de 2026-07-10 (mesmo pré-processamento e mesmo arquivo da GMC-010), replay a 500ms via dev/replay.js, ANALYZE_EVERY=120. Quatro servidores em paralelo (portas 8741-8744), um por modelo, lançados por um script node descartável no scratchpad que passa { url, model, thinking } direto para createApp — CLIS não foi tocado. As quatro rodadas correram em lockstep (mesmo instante, mesma cadência, mesmo conteúdo por tick), então as diferenças são do modelo, não do recorte da transcrição. Watcher de checksum a cada 20s registrou 3 analysis.txt distintos por rodada, evidenciando injeção da análise anterior e a seção 6.

Achado de infra (não é bug): o replay 404 quando o meet code tem dígito — ROUTE em server.js:10 aceita só [a-z]{3}-[a-z]{4}-[a-z]{3}. Os códigos "q38"/"q37" foram trocados por "qwf"/"qwp" e as quatro rodadas reiniciadas do zero para não ficarem defasadas no tempo.

=== Verificação de aterramento (grep na transcrição, não impressão de fluência) ===
Checados: "bucket" (linha 77, sem menção a S3/GCS), "Eval"/"Golden 7"/"dataset" (linhas 483-619, Douglas), "TM"/"XP" (linhas 468/480, churn enterprise), "Mi tá off / banco de horas" (linhas 430-431), "aspas simples" (linha 142), "empilhar branches" (linhas 286-287), "controle/auditoria/permissionamento" (linhas 510-511), "Damari" (linhas 176-187, fala do Allan sobre a branch/ticket da Mariana).

=== qwen3.8-flash (6875 bytes) — melhor cobertura ===
- Único a puxar a justificativa estratégica real: perda de contratos enterprise citando TM e XP (aterrado, linhas 468/480).
- Único a captar "Mi/Mai off, banco de horas" e transformar em pergunta sobre capacidade de code review (aterrado, linhas 430-431).
- Reconstruiu "Golden 7" (garble do ASR) como "Golden Set" e perguntou se o dataset já existe — reconstrução correta, não fabricação.
- Captou o detalhe técnico das aspas simples no Cloud Run Job (linha 142).
- Nenhuma fabricação encontrada nos itens checados.
- Fraquezas: prefixo meta na saída ("Aqui está a análise atualizada...") que vira ruído na UI; seção 2 editorializa ("Socialização excessiva: os primeiros minutos foram desperdiçados") sobre ~1 min de conversa; resolve "Damari" só parcialmente (5 Damari x 4 Mariana).

=== deepseek-v4-flash (5203 bytes) — o preferido da GMC-010, agora via API direta ===
- Seção 3 (contradições/pontas soltas) é a mais forte das quatro: 8 itens, cada um com o dono e o que falta.
- Seção 4 bem atribuída, formato "Quem -> o quê".
- Seção 6 é a única que nota explicitamente um alerta anterior encerrado e uma pergunta anterior parcialmente respondida.
- Perdeu inteiramente a linha de Eval / Golden Set / dataset (linhas 483-619), que é substantiva e ocupa vários minutos.
- Não perdeu qualidade em relação à rodada via CLI opencode da GMC-010: o overhead do coding-agent não estava carregando o resultado.
- Mantém "Damari" (6x contra 1 Mariana).

=== qwen3.7-plus (4558 bytes) — controle, modelo atualmente fixado ===
- Único a reconciliar "Damari" -> Mariana em 100% das menções (0 Damari, 4 Mariana) — é o comportamento-alvo da GMC-011.
- Mais enxuto e mais fácil de ler em tela.
- FABRICAÇÃO: chama de "Bucket S3" o que a transcrição só chama de "bucket" (linha 77), inventando o fornecedor. É a mesma fabricação registrada na GMC-010, agora reproduzida pela via de API direta — logo é do modelo, não do CLI.
- Vazamento de idioma: uma das perguntas sugeridas saiu em inglês, apesar do "Responda em português" do PROMPT.
- Perdeu "Mi off / banco de horas".

=== mimo-v2.5 (4947 bytes) — o mais fraco ===
- Repassa lixo do ASR sem reconstruir: "home editori/branderro de SSR" aparece literalmente em três seções.
- Erro de digitação próprio ("Validoado"), não herdado da transcrição.
- Seção 1 fragmenta demais: 10 tópicos de ~1 min cada, quase um por ticket, o que anula o valor do "tempo aproximado gasto".
- Seção 6 termina com "Alertas que deixaram de valer: Nenhum" — cumpre o formato sem conteúdo.
- Perdeu Eval/Golden Set e Mi/banco de horas; mantém "Damari" (7x).

=== Recomendação ===
Trocar CLIS["go-qwen"].model de "qwen3.7-plus" para "qwen3.8-flash". O modelo atualmente fixado é o único dos quatro com fabricação verificada (S3) e ainda vaza idioma; o qwen3.8-flash cobriu mais matéria real da reunião sem inventar nada nos itens checados. O preço é um prefixo meta na saída e um tom mais opinativo na seção 2 — ambos tratáveis no prompt, não no modelo.

Ressalvas: (a) n=1 por modelo, saída não-determinística; (b) a única vantagem clara do qwen3.7-plus é reconciliar nomes, e isso é alvo da GMC-011, que é trabalho de prompt e beneficiaria os quatro modelos; (c) latência e custo não foram medidos — GMC-019 continua To Do e é o que fecharia a comparação; (d) a adjudicação final é do usuário, que participou da reunião.

Desdobramentos sugeridos (não criados): task para a troca do model id em CLIS (mudança de código, precisa de task própria); linha no PROMPT contra preâmbulo meta ("responda direto, sem frase de abertura").
<!-- SECTION:NOTES:END -->
