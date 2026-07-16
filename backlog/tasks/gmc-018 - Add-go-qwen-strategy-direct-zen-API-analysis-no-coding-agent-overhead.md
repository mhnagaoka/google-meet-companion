---
id: GMC-018
title: 'Add go-qwen strategy: direct zen API analysis (no coding-agent overhead)'
status: Done
assignee:
  - '@opencode'
created_date: '2026-07-16 12:54'
updated_date: '2026-07-16 13:07'
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
- [x] #1 node server.js go-qwen selects a strategy that calls the zen Go chat/completions endpoint (not a spawned CLI) using qwen3.7-plus
- [x] #2 The request disables reasoning via thinking:{type:disabled} in the JSON body
- [x] #3 The bearer key is read from ~/.local/share/opencode/auth.json [opencode-go].key, and OPENCODE_API_KEY overrides it when set
- [x] #4 The fetch path parses choices[0].message.content and, on HTTP/parse failure or empty content, keeps the last good analysis (parity with the spawn path)
- [x] #5 Spawn and fetch paths share one applyAnalysis(s,out) that trims, sets s.analysis/updatedAt, and writes analysis.txt
- [x] #6 Existing claude (default) and opencode strategies are unchanged; the server still boots for them when no key is present
- [x] #7 Missing key only errors when go-qwen is the selected strategy
- [x] #8 No session/history files are created on disk by the go-qwen path
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add go-qwen strategy object to CLIS with zen endpoint url/model/thinking config.\n2. Add loadApiKey() helper reading OPENCODE_API_KEY env or ~/.local/share/opencode/auth.json.\n3. Extract applyAnalysis(s, out) for shared output handling between spawn and fetch paths.\n4. Refactor analyze() to branch on llm.url: fetch path builds OpenAI-compatible body, parses choices[0].message.content, and funnels through applyAnalysis.\n5. Keep spawn path unchanged except routing through applyAnalysis.\n6. Add unit test for fetch path using a local mock endpoint and OPENCODE_API_KEY override.\n7. Run npm test and npm run check; commit on gmc-018.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented go-qwen strategy in server.js with direct fetch to zen endpoint, shared applyAnalysis helper, and auth key resolution. Added two unit tests covering the fetch path (success and empty-response fallback). npm test passes (18/18); npm run check exits clean (remaining infos are in pre-existing files).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Added the go-qwen analysis strategy: node server.js go-qwen posts the transcript prompt directly to opencode's zen Go chat/completions endpoint (qwen3.7-plus, thinking:{type:disabled}) instead of spawning a coding-agent CLI. analyze() is now async and branches on llm.url; a shared applyAnalysis(s,out) funnels both spawn and fetch output handling (trim, empty-guard keeps last good analysis, set s.analysis/updatedAt, write analysis.txt). Bearer key resolves from OPENCODE_API_KEY then ~/.local/share/opencode/auth.json [opencode-go].key, read only when go-qwen is selected so claude/opencode still boot keyless. Two unit tests cover the fetch path (success + empty-response fallback) via a local mock endpoint. README + PRD updated to document the new strategy and its key source. Implemented by opencode/Kimi on branch gmc-018; docs added by lead in review. npm test 18/18, biome clean.
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
