---
id: GMC-018
title: 'Add go-qwen strategy: direct zen API analysis (no coding-agent overhead)'
status: To Do
assignee: []
created_date: '2026-07-16 12:54'
labels: []
dependencies: []
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a third analysis strategy selectable as `node server.js go-qwen` that calls opencode's OpenAI-compatible zen Go endpoint directly, instead of spawning a coding agent (claude/opencode). The current strategies spawn a full coding-agent CLI just to do a text-in/text-out transcript summarisation, carrying the agent system prompt, tool/MCP definitions and the risk of tool-use — all irrelevant for this task. A direct HTTP call is leaner, more predictable, faster, and creates no session/history on disk.

Endpoint: POST https://opencode.ai/zen/go/v1/chat/completions (OpenAI-compatible). Model: qwen3.7-plus with reasoning disabled via request body field thinking:{type:"disabled"} (confirmed to work; reasoning_effort is ignored by this endpoint). Auth: static bearer key read from ~/.local/share/opencode/auth.json -> ["opencode-go"].key, overridable by OPENCODE_API_KEY env var.

server.js currently assumes every CLIS entry is spawn(cmd,args): prompt goes in via stdin (server.js:272) and stdout is taken verbatim as the analysis (server.js:263). The zen entry is not a subprocess, so it needs a fetch code path that builds the OpenAI messages body and parses choices[0].message.content. Extract the current close-handler body (trim, bail on empty->keep last good analysis, set s.analysis, write analysis.txt) into a shared applyAnalysis(s, out) so both the spawn and fetch paths funnel through identical output handling. Branch on presence of an entry field (e.g. url): if set, fetch; else spawn.

Chosen default among tested models (Jul 2026, ~12k-token real transcript): qwen3.7-plus reasoning-off — 21s, best quality/latency, $0.0062/call. Alternatives to document, not build: deepseek-v4-flash reasoning-off (19s, $0.0021, plainer bullets); mimo-v2.5-pro dropped (50s AND $0.0316, ~5x cost). Reasoning-on variants dropped (74s, dominated). Go billing is a prepaid allowance with rolling caps, so per-call cost affects how much can run before a cap, not the bill.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 node server.js go-qwen selects a strategy that calls the zen Go chat/completions endpoint (not a spawned CLI) using qwen3.7-plus
- [ ] #2 The request disables reasoning via thinking:{type:disabled} in the JSON body
- [ ] #3 The bearer key is read from ~/.local/share/opencode/auth.json [opencode-go].key, and OPENCODE_API_KEY overrides it when set
- [ ] #4 The fetch path parses choices[0].message.content and, on HTTP/parse failure or empty content, keeps the last good analysis (parity with the spawn path)
- [ ] #5 Spawn and fetch paths share one applyAnalysis(s,out) that trims, sets s.analysis/updatedAt, and writes analysis.txt
- [ ] #6 Existing claude (default) and opencode strategies are unchanged; the server still boots for them when no key is present
- [ ] #7 Missing key only errors when go-qwen is the selected strategy
- [ ] #8 No session/history files are created on disk by the go-qwen path
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
