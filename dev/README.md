# dev/ — caption-capture investigation trail

Scratch tooling and empirical findings from figuring out **how Google Meet's
captions DOM behaves**, before writing the real bookmarklet. Not part of the
shipped tool — this is the evidence behind the design.

The curated conclusions live in [`../docs/PRD.md`](../docs/PRD.md) (Hard Problems
#1/#2) and [`../docs/adr/0001-caption-delivery-mechanism.md`](../docs/adr/0001-caption-delivery-mechanism.md).
This folder is the raw trail that produced them — kept so the findings can be
re-verified when Meet changes its DOM.

## Files

| File | What it is | Why it exists |
|---|---|---|
| `caption-probe.js` | Paste-into-DevTools `MutationObserver` that records how caption items appear/grow, with per-element identity. | The instrument. Answers "does Meet reuse nodes? render concurrent speakers as separate items?" without guessing. Re-run it if Meet's DOM changes and the selectors need re-checking. |
| `caption-test-script.md` | PT-BR choreography (Mau + Laura) — what to say and when, each phase targeting one probe metric. | Made the two-participant test reproducible: solo speech, rapid alternation, simultaneous speech, mid-turn pause, long monologue. |
| `caption-test-script.html` | Same script as a self-contained styled page for the second participant to read live. | Laura needed something readable during the call; hides the technical/DevTools bits. |
| `dom-behavior.md` | The findings: step-by-step DOM behavior in each scenario, with the recorded timeline. | The payoff — why `captions.js`/the bookmarklet is built the way it is. Companion reference to the PRD. |

## How they connect

```
caption-probe.js   →  caption-test-script.(md|html)  →  dom-behavior.md
  (instrument)          (procedure, run twice)            (findings)
```

Verified 2026-07-11 against a live two-participant call. To re-verify: run
`caption-probe.js` in a Meet call, follow the test script, then check the results
against `dom-behavior.md`.
