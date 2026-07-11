# Google Meet captions — DOM behavior

Empirical reference for how Meet mutates the captions DOM, and why `captions.js`
is built the way it is. **Verified** on 2026-07-11 against a live two-participant
call (Mau + Laura), using `dev/caption-probe.js` + the script in
`dev/caption-test-script.md`. Re-run those if Meet changes and this doc looks wrong.

Companion to the PRD (see Hard Problems #1/#2). The PRD says *what we build*; this
says *what Meet does*.

## The mental model (one picture)

The captions region is an **append-only list of item elements**. Each item is one
speaker turn:

```
[region  aria-label="Captions"]
  ├─ item  .nMcdL.bj4p3b   →  .NWpY1d "Laura Nagaoka"   .ygicle.VbkSUe "Tá bom."
  ├─ item  .nMcdL.bj4p3b   →  .NWpY1d "You"             .ygicle.VbkSUe "Teste um..."
  └─ item  .nMcdL.bj4p3b   →  ...
```

Only the **tail item(s)** are "live" — their text node mutates as someone speaks.
Once a speaker loses the floor, their item **freezes** and just sits in the list;
nothing ever edits a frozen item again. Everything below is that rule playing out.

Selectors: region `[role="region"][aria-label*="caption" i]` (localized — see
PRD Hard Problems #1 for the fallback list); item `.nMcdL.bj4p3b`; speaker
`.NWpY1d`; text `.ygicle.VbkSUe`.

## Scenario 1 — one person speaks

t=22s, Laura had said "Tá bom." → one frozen item:

```
[region]
  └─ A: "Laura Nagaoka: Tá bom."   (frozen)
```

t=28.4s, Mau starts → Meet **appends item B** and grows *only B's text node*:

```
28.4  A:"Laura: Tá bom."  |  B:"You: teste"
28.8  A:"Laura: Tá bom."  |  B:"You: teste um"
29.3  A:"Laura: Tá bom."  |  B:"You: teste um aqui"
30.4  A:"Laura: Tá bom."  |  B:"You: Teste um aqui eu mal falando sozinho."
```

A never changes (frozen); only B mutates. t=34.5s Laura speaks again → item C
appended, B freezes.

**Takeaway:** each new turn = one new item appended; the previous tail freezes.

## Scenario 2 — rapid back-and-forth

Every speaker switch = one new appended item. Four exchanges = four items:

```
D: "You: Laura você me ouve?"      (42.7s)
E: "Laura: Posso sim"              (45.7s)
F: "You: Ótimo vamos continuar."   (47.9s)
G: "Laura: combinado"              (50.5s)
```

The list just grows (n: 4→5→6→7). Same rule, applied fast.

## Scenario 3 — both talk at once ⭐

t=76–83s, Mau counted numbers while Laura counted weekdays. Meet appended **two
items** and grew **both simultaneously**:

```
77.1  J:"You: Um dois três."               K:"Laura: segunda terça"
78.0  J:"You: Um dois três quatro."         K:"Laura: segunda terça quarta"
80.1  J:"You: ...quatro cinco."             K:"Laura: ...quarta quinta sexta"
83.0  J:"You: ...cinco seis sete."          K:"Laura: ...sábado domingo."
```

Two independent tail items, two text nodes, both mutating in the same window.
The `MutationObserver` fires for both; read both each tick. Concurrent speakers
are just two live items instead of one.

## Scenario 4 — pause in the middle of a sentence ⭐

This killed the debounce idea. Mau (item J) said "Esta frase começa agora.", went
**silent ~7s**, then continued — in the *same* item:

```
91.3  J:"You: ...oito. Esta frase começa agora."
        ⏸  (7 seconds of silence — J stays live, does NOT freeze)
98.3  J:"You: ...Esta frase começa agora. e"
99.0  J:"You: ...Esta frase começa agora. E termina dep..."
```

**A pause does NOT create a new item.** So a debounce-on-silence model would be
wrong — it would split one turn into two lines.

## Scenario 5 — a turn absorbing everything

Laura took the floor at t=103.7s (item L) and Mau stayed silent. Her Fase-4 line
AND her entire Fase-5 monologue accumulated into **one item**:

```
105.7  L:"Laura: A Laura também começa uma ideia."
        ⏸ (pause — L still live)
110.6  L:"Laura: ...uma ideia. E conclui depois de parar no meio."
        ⏸ (pause — still L)
119.5  L:"Laura: ...parar no meio. agora eu vou..."   → monologue keeps appending to L
```

One item = one long transcript line, across multiple sentences and pauses, because
Laura never lost the floor.

## When does Meet start a *new* item?

The trigger is a **speaker handoff** — a different participant's speech segment
begins — **not** a pause, and **not** a sentence end. One participant talking
continuously (even with gaps) = one growing item. Hand the floor to someone else
= a new item appended.

## Why this makes the extension trivial

Each item is a **stable element with its own identity**, so `captions.js` is just:

1. Observer fires on any change inside the region.
2. For each `.nMcdL.bj4p3b` item present, look up its id in `WeakMap<Element,id>`
   (assign a new id + `seq` on first sight).
3. Read `.NWpY1d` (speaker) + `.ygicle.VbkSUe` (text), POST `{id, speaker, text}`.
4. Server replaces by id.

A growing item re-POSTs the same id with longer text (server overwrites → line
updates live). A frozen item stops POSTing (its last text is already saved). A new
turn is a new element → new id → new line. No debounce, no dedup, no "is this
final?" guessing — the element *is* the identity, and the tail-grows / others-frozen
rule guarantees it.

## Caveats / things not exhaustively tested

- **Rolling-window drop:** up to 17 items coexisted in the DOM; we did not observe
  Meet *removing* old items (call was short). Doesn't matter — the server persists
  each line under its id, so a dropped element is already saved.
- **Element swap on finalize:** not observed (17 clean, distinct final lines, no
  duplicates), but not exhaustively proven under every condition. If it ever
  happens it produces a duplicate line → content-dedup is the cheap fallback.
- **Very long single turn:** one uninterrupted speaker = one long item = one line
  with a single start-`ts`. Acceptable for v1.
- **Local user shows as "You"**, remote participants show real names ("Laura
  Nagaoka"). Map "You" → a real name only if desired.
