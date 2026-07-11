# ADR-0001: Caption capture delivery mechanism

- **Status:** Accepted
- **Date:** 2026-07-11
- **Supersedes / relates to:** PRD Component 1, Hard Problems #1/#2

## Decision

Deliver the caption-capture code as a **self-contained inline bookmarklet** — the
whole capture logic minified into one `javascript:` blob, clicked once per call.
The local server opts into cross-origin POSTs with plain CORS headers; the user
grants a one-time Chrome "Local Network Access" permission on first use.

## Context

- This is a **personal, single-user, local** tool (a PRD non-goal is multi-user /
  cloud). It does not need auto-injection, background presence, or a store listing.
- `meet.google.com` is a **hardened origin**: it enforces **Trusted Types**
  (`require-trusted-types-for 'script'` for DOM script sinks) and a strict CSP, and
  Chrome gates public→localhost requests behind **Local Network Access (LNA)**.
- Empirically verified on 2026-07-11 (Chrome, live Meet tab, via DevTools injection):

  | Probe | Result |
  |---|---|
  | `fetch()` https://meet.google.com → http://localhost:8737 | **works** after a one-time LNA "Allow" prompt; persists per origin |
  | `Access-Control-Request-Private-Network` preflight header | **not sent** by Chrome — the old PNA `Allow-Private-Network` server header is inert |
  | `script.src = "http://localhost/..."` (string) | **blocked** — "This document requires 'TrustedScriptURL' assignment" |
  | `trustedTypes.createPolicy(...)` | works (escape hatch exists) — but external load still faces `script-src`, which won't list localhost |
  | `eval(...)` / `new Function(...)` | worked in the probe context (but the probe's CSP context may not mirror a real bookmarklet — see below) |

## Alternatives considered

### A. Chrome MV3 extension (content script) — *rejected*
The original plan. A content script auto-injects and runs in an isolated world with
**no CSP / Trusted Types constraints**, and (with host permissions) no LNA prompt.
Rejected because it reintroduces the whole MV3 scaffold — `manifest.json`,
permissions, popup, packaging/reload — to buy auto-injection and a CORS bypass a
self-driven tool doesn't need. **The one thing it's genuinely better at is
live-editability** (edit file, reload extension); if that ever dominates, revisit.

### B. Loader bookmarklet via external `<script src>` — *rejected (impossible)*
Idea: a tiny permanent bookmarklet that injects `<script src="http://localhost:8737/
capture.js">`, moving the real code server-side for easy edits. **Dead on Meet:**
Trusted Types blocks assigning the URL string to `script.src` outright, and even
minting a `TrustedScriptURL` via a policy leaves the external load subject to
`script-src`, which does not allow localhost.

### C. Loader bookmarklet via `fetch(...).then(eval)` — *parked (unvalidated)*
Idea: `javascript:fetch('http://localhost:8737/capture.js').then(r=>r.text()).then(eval)`.
Both halves worked in the probe (fetch proven; `eval` returned a value). This would
give the server-side-editable ergonomics of B without the `<script>` sink. **Parked,
not adopted:** the probe ran in Claude's browser-extension injection context, which
may not mirror a real bookmarklet's CSP environment (a strict Google CSP often
blocks `unsafe-eval`; we saw an odd Trusted-Types-blocks-`script.src`-but-`eval`-works
split). Confirming needs an actual bookmarklet click. If someone wants the
live-edit workflow later, run that test; if `eval` survives, C is a clean upgrade.

## Consequences

- **Server:** add plain CORS to `POST /caption` — `Access-Control-Allow-Origin: *`,
  `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Allow-Methods:
  POST, OPTIONS`, and answer `OPTIONS` with `204`. Do **not** rely on
  `Allow-Private-Network` (inert). ~6 lines.
- **User, first run per origin:** one "Allow local network access" click. Documented
  alongside "enable captions." Persists.
- **Editing the capture code** means editing `bookmarklet.src.js` and re-minifying /
  re-saving the bookmark. Rare (mostly Meet DOM selector renames); selectors sit at
  the top of the source. Accepted cost — the blob is ~1 KB.
- **No popup / no manifest / no permissions review** — the MV3 scaffold is gone.
