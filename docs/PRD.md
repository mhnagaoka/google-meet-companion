# PRD — google-meet-companion

A live meeting copilot that scrapes **Google Meet captions** (instead of recording
audio) and, every couple of minutes, asks an LLM for an analysis — topics and time
spent, time alerts, contradictions and loose ends, decisions, suggested questions,
and what changed since the last analysis.

```
Bookmarklet (clicked once per call on meet.google.com)
  MutationObserver on the captions DOM
    → POST /m/<id>/caption {title, id, speaker, text}   (upsert)
      → local Node server (localhost:8737), one long-lived process
          • Map<meetingId, session>: ordered utterance map (+ transcript.txt)
          • global analysis tick → per-session analysis.txt  (LLM every N sec if changed)
          • serves a side-by-side page per meeting, polled by the browser
```

The Meet code (`meet.google.com/abc-defg-hij` → `abc-defg-hij`) is the session
key, so one server tracks many meetings concurrently — join any call and it's
picked up automatically.

Everything runs locally except the LLM call.

## Why captions, not audio

Meet captions hand us, for free, the two hardest parts of an audio pipeline:

- **Real speaker names.** Meet labels each caption with the participant, giving
  true diarization for nothing (`"You"` for the local user).
- **No local ML / GPU / audio deps.** No speech-to-text model, GPU, or
  audio-capture pipeline to run — just a bookmarklet, a small HTTP server, and the
  analysis loop.

## Goals

1. Capture Meet captions live, with speaker names, handling in-place updates.
2. Persist a running transcript per meeting.
3. Run the analysis loop against that transcript via the `claude` / `opencode` CLI.
4. Serve a side-by-side page (transcript left, analysis right) at `localhost:8737`.

## Non-goals

- No audio capture / local ASR of any kind.
- No verbatim minutes — captions are lossy; this is a copilot, not a court record.
- No cloud service, no auth, no multi-user. Single local user.
- No forcing captions on — the user enables them (documented step).

## Decisions (locked)

| Area | Choice | Note |
|---|---|---|
| Capture | Meet captions only | No audio pipeline |
| Server | Node.js, stdlib `http` only | No framework, dep-free |
| LLM | shell out to `claude` / `opencode` CLI, or direct HTTP to zen (`go-qwen`) | CLIs need no API key; `go-qwen` reads one from env/auth.json |
| UI refresh | browser polls `GET /m/<id>/state` | SSE only if polling proves twitchy |
| Session model | one long-lived server, keyed by Meet code | Tracks many meetings at once; `node server.js [claude\|opencode\|go-qwen]`, no title arg |

## Components

### 1. Bookmarklet (self-contained inline blob)

Delivery mechanism decided in [ADR-0001](adr/0001-caption-delivery-mechanism.md):
a self-contained inline bookmarklet, chosen over an MV3 extension and over
server-loaded `<script>` / `fetch+eval` approaches (blocked by Meet's Trusted
Types + CSP).

- Clicked **once per call** after captions are on (`c`). No auto-injection, no
  manifest, no permissions review.
- A `MutationObserver` watches the captions region; each caption item is tagged via
  `WeakMap<Element,id>` and POSTed as an upsert as its text grows (see Hard
  Problems #2 for the model).
- Reads the **Meet code** from `location.pathname` and the **title** from
  `document.title`; the code rides in the POST path, the title in the body.
- **Per-item identity lives here, not in the server** (see Hard Problems #2).
- Transport: `fetch('http://localhost:8737/m/'+code+'/caption', {method:'POST',
  body:JSON})` — the code in the path (so the server's strict parser guards every
  route), `{title, id, speaker, text}` in the body.
  On first use per origin, Chrome prompts once for **Local Network Access**
  ("Allow"); granted, it persists — a documented one-time step, like enabling
  captions. A failed POST (server down) is dropped silently — no buffering.
- No popup (a bookmarklet has none); the server URL is baked into the blob.
- Self-contained (~1 KB minified); no server-loaded code. Readable source in the
  repo (`bookmarklet.src.js`), minified to the `javascript:` blob on build. All DOM
  selectors up top so a Meet DOM change is a one-line edit + re-minify.

### 2. Node server (`server.js`, stdlib only)

- **Listens on `127.0.0.1` explicitly** — `listen(PORT, '127.0.0.1')`, never the
  `0.0.0.0` default: `GET /` lists every meeting and `/state` serves full
  transcripts, so the default bind would expose them to anyone on the LAN.
- Keeps `Map<meetingId, session>`; a session is created on first `POST /m/<id>/caption`
  for a code. **Restart recovery:** if the day's `transcript.txt` already exists at
  creation (server restarted mid-meeting; the bookmarklet keeps POSTing), read it
  into a frozen `prefix` string; every render is `prefix +` lines-from-the-map. Without
  it, rewrite-whole would clobber the pre-restart transcript with the near-empty new
  map. No session JSON, no parsing lines back into utterances — worst case is one
  duplicated partial line (the item mid-growth at the crash), which the LLM won't
  blink at.
- `POST /m/<id>/caption` — upsert `{title, id, speaker, text}` into that
  session's ordered Map. `meetingId` comes from the path, not the body. The body
  is cross-origin input: cap it (~64 KB; real caption POSTs are <1 KB) and wrap
  `JSON.parse` in a try/catch → `400` — an uncaught throw in the handler kills
  the whole process mid-meeting.
- **Request-path error boundary:** all routes run inside a single wrapped async
  handler whose top-level `.catch` logs the error and answers `500` (when
  headers aren't already sent) — an unhandled throw or rejection (e.g. a disk
  write failing) degrades persistence for that request instead of killing the
  server; memory state and `/state` keep serving.
- `GET /` — lists meetings (link to each `/m/<id>`): in-memory sessions unioned
  with on-disk `meetings/` dirs, so past meetings show after a restart.
- `GET /m/<id>` — serves a **constant** HTML+JS shell, identical bytes for every
  `<id>`. No server-side rendering: `<id>` never appears in the HTML, only in the
  URL the shell's JS polls. The route ignores `<id>` and returns one fixed string
  (the page shell — see Component 3, read once at startup or inlined).
- `GET /m/<id>/state` — JSON `{title, transcript, analysis, updatedAt}` for polling.
  Falls back to a pure disk read (no session materialized, no analyze tick) when
  the id has a `meetings/` dir but no live session.
- **CORS:** `POST /m/<id>/caption` is cross-origin from `https://meet.google.com`, so
  respond with `Access-Control-Allow-Origin: https://meet.google.com` (not `*` —
  nothing else legitimately posts, and pinning it costs the same one line),
  `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Allow-Methods:
  POST, OPTIONS`, and answer the `OPTIONS` preflight with `204`. No
  `Allow-Private-Network` header (see ADR-0001). ~6 lines.
- All routes share one `<id>` parser — a single
  `req.url.match(/^\/m\/([a-z]{3}-[a-z]{4}-[a-z]{3})(\/caption|\/state)?$/)` plus a
  couple of `if`s on `req.url`, not a route table or framework (stdlib `http` only).
  The strict Meet-code shape is load-bearing, not pedantry: `<id>` is cross-origin
  input that becomes a filesystem path (`meetings/<date>-<id>/`), so anything else
  (e.g. `../`) 404s before touching disk or the session Map.
- Writes `meetings/<date>-<id>/transcript.txt` and `analysis.txt` (`meetings/`
  git-ignored). `transcript.txt` is **rewritten whole** from the utterance map —
  never appended, since an upserted item can grow *after* its line was written —
  on **each analysis tick** and **once on shutdown** (SIGINT/SIGTERM close the
  server, which flushes every session after the timer is cleared); the caption
  handler only upserts memory and marks the session dirty. Worst hard-crash loss
  is the captions since the last tick (≤ `ANALYZE_EVERY`); a clean exit loses
  nothing, and the restart-recovery prefix preserves whatever hit disk. The
  analysis tick owns both files, the shutdown flush never overlaps it. Date in
  the dir since recurring Meet codes repeat across days; in-memory session keys
  on `id` alone (one live at a time).
- **Analysis loop:** one **global** `setInterval(ANALYZE_EVERY)` looping the
  session Map — a single timer, no per-session timer lifecycle to leak. For each
  session that is **dirty and has no run in flight** — a per-session `dirty`
  boolean set by the `POST /m/<id>/caption` upsert handler (the only write path) and
  cleared on spawn; no size/content comparison, the write path records the event —
  spawn the CLI **async** (`spawn`, never sync — a sync call would freeze caption
  ingestion and `/state` for the whole LLM call) with the prompt **on stdin**
  (avoids ARG_MAX on long transcripts) and write its `analysis.txt` on completion.
  - **In-flight flag** per session: set on spawn, cleared on exit. A run may
    legitimately outlive the interval (long transcript); the flag prevents a
    second concurrent run racing to write the same `analysis.txt`. Skipped ticks
    lose nothing — captions arriving mid-run set `dirty` again, so the next free
    tick re-analyzes.
  - **Hang timeout:** `spawn`'s own `{ timeout }` option (stdlib, no `timeout(1)`
    wrapper), generous (~5 min) — a hang-guard so a wedged CLI can't hold the
    in-flight flag forever, *not* an interval-fitter: killing a slow-but-working
    run at <120s would livelock exactly on the long calls that need analysis most.
  - An empty or killed reply must not clobber the last good analysis.

### 3. The page (`index.html`)

- **Two columns, full height.** Transcript left (dark, monospace, `white-space:
  pre-wrap`; autoscroll only when already at the bottom), analysis right (light,
  markdown rendered via a small library, e.g. `marked` from a CDN). A header shows
  the meeting `title` and the last-analysis time (both from `/state`).
- **Static shell, client-derived id.** The same HTML served for every meeting; the
  JS reads `<id>` from `location.pathname` and builds its own `/m/<id>/state` URL.
- Polls `/state` every ~2s. `ponytail:` re-render is gated on `updatedAt` — skip it
  when unchanged (idle call → no work; analysis is byte-identical between the ~120s
  runs). Ceiling: full transcript re-render on a long call; upgrade path is a
  high-water cursor + append, only if the tail ever janks.

## Data model

An utterance (within a session keyed by `meetingId`):

```
{ id: string,        // per caption item (speaker turn), from WeakMap<Element,id>
  speaker: string,    // Meet participant name ("You" for the local user)
  text: string,       // item's current text; grows live, upsert replaces by id
  ts: "HH:MM" }       // server arrival time (Meet exposes no caption time)
```

The Meet code rides in the POST path (`/m/<id>/caption`), the `title` in the body
(for display); the server routes to the matching session, creating one on first sight.

**Ordering is Map insertion order** — the session Map preserves first-sight order
of each `id`, so there is no `seq` field and no sort. *Known limitation:* this is
first-POST **arrival** order, not DOM creation order; two items born within the
same ~400ms coalesce window (concurrent speakers) can arrive swapped. Invisible to
the LLM analysis — crosstalk captions are interleaved approximations anyway.

`ts` is the single home of the timestamp. The `[HH:MM Speaker] text` line
(in insertion order) is **derived on read** — materialized for `/state` and written
whole to `transcript.txt`, never cached as a separate in-memory string. The
utterance stays structured (not a flat pre-rendered line) because upsert replaces
by `id`.

## Local storage

Two layers.

**In-memory** (`Map<meetingId, session>`, lost on exit), per session: `meetingId`,
`title`, the ordered utterance map (see Data model), the last analysis text +
`updatedAt`, the analysis loop's bookkeeping (`dirty` + in-flight flags), and the
restart-recovery `prefix` (usually empty — see Component 2). *Known limitation:* **sessions are never evicted** — the server
can't tell a meeting ended, so ended sessions sit in the Map until restart. Cost
is one change-check per tick and the transcript in RAM (KBs per meeting, no LLM
calls once the transcript stops changing); a restart between meetings clears it.
Add idle-eviction only if a long-running server ever accumulates enough sessions
to matter.

**On-disk**, under `meetings/<date>-<id>/` (**git-ignored**, kept forever — never
pruned):

- `transcript.txt` — first line is a title header (`# <title> — <meetingId>`),
  then the rendered `[HH:MM Speaker] text` lines in insertion order. The header is
  what makes the title survive server exit (the dirname only holds date + code);
  the restart-recovery prefix inherits it for free.
- `analysis.txt` — latest good LLM analysis (markdown).

No `meeting.json` in v1. Every field it would hold is already available without
storing it: `meetingId`/`url` from the dirname, `title` from the transcript header
(or `/state`), `llm` from the launch arg, `participants` as
`[...new Set(speakers)]` derived from the transcript at read time. Write it when a
*reader* exists (the deferred Calendar/index feature, see Future ideas), not before.

**Metadata sources — what's free vs what isn't:**

- *Free from the transcript* (no extra scraping): id, title, url, timestamps, and
  participants **as distinct caption speakers** — all derivable from what we
  already capture.
- *Not worth scraping for v1 — full roster incl. silent attendees:* would need the
  participants panel, a second obfuscated Meet DOM anchor with its own join/leave
  churn, to add names the analysis never uses (it reasons over the transcript;
  silent attendees contribute no lines). Easy follow-up if a reader ever needs it.
- *Not on the Meet page at all — Calendar only:* subject/agenda, invite
  description, attendee **emails**, organizer, scheduled start/end. These require
  Google Calendar integration (extra permission + real work) and are **deferred to
  Future ideas**, not blocking v1.

Not stored: no audio (there is none), no interim caption history (upsert-by-id keeps
only each item's latest text, which converges to the finalized turn).

The flat files are the source of truth. Any future index (see Future ideas) is a
*derived* artifact rebuildable from them, so it doesn't constrain v1.

## Hard Problems

DOM behavior is verified against a live **two-participant** Meet call (probe +
`MutationObserver` via Chrome DevTools; PT-BR test script in `dev/`), with the
selector strategy cross-checked against a shipping reference extension
([`google-meet-cc-to-srt`](https://github.com/yunho0130/google-meet-cc-to-srt),
v3.8.9). **Step-by-step DOM behavior with the recorded
timeline: [`../dev/dom-behavior.md`](../dev/dom-behavior.md).**

1. **Caption DOM is fragile / obfuscated.** The captions live in
   `[role="region"][aria-label*="caption" i]`. Use a **layered selector list** in
   `bookmarklet.src.js`, first match wins:
   - `[role="region"][aria-label*="caption" i]` — primary (English UI).
   - `[role="region"][aria-label*="legenda" i]` — the user's PT-BR UI (`aria-label`
     is localized; other locales are YAGNI — the jsname layer below catches them).
   - `[jsname="dsyhDe"]` — jsname fallback for any locale not listed.
   Within the region, one **item per speaker turn** (`.nMcdL.bj4p3b`), each holding
   speaker (`.NWpY1d`) + text (`.ygicle.VbkSUe`). Obfuscated classes are precise but
   rename-prone — and the remedy is already the maintenance story (selectors up
   top, one-line edit + re-minify), so **no class-free fallback parser**. No
   exclude list either (GMC-004): the observer is scoped to the captions region
   and only reads the exact item class `.nMcdL.bj4p3b`, so non-caption UI
   (`[role="dialog"]`, buttons, mute/camera controls) can't match — an exclude
   list would guard a parser we don't build. All of it in `bookmarklet.src.js`;
   one-file maintenance.

2. **Update-vs-append + rolling window (the actual hard part).** Meet's behavior:
   - Each **caption item is one speaker turn** — a stable element that grows text in
     place across multiple sentences *and* multi-second pauses; a new item starts on
     **speaker change**, not on pause. (A long uninterrupted turn = one long item =
     one transcript line with a single start-`ts`; fine for v1.)
   - Items **accumulate append-only** in the DOM (a rolling history — 17 lines seen
     coexisting), each frozen once finalized. No interim→final element swap and no
     duplicates (17 clean distinct final lines).
   - **Concurrent speakers → multiple items grow simultaneously** (two items
     updating at once during overlapping speech).

   So the item element is a clean, stable identity, keyed on the **item element**:
   tag each `.nMcdL.bj4p3b` via `WeakMap<Element,id>`; on mutation, upsert
   `{id, speaker, text}` (the item's full current text) to the server, which **just
   replaces by id**. Item grows → same id → text replaced; freezes → last text
   sticks; new turn → new item → new id. Concurrent speakers fall out for free
   (independent items). **No debounce, no dedup, no server-side fuzzy-merge** — the
   element *is* the identity. Per-item POSTs are coalesced with a light ~400ms
   trailing debounce purely to cut transport chatter, not for identity (a constant
   in `bookmarklet.src.js` — baked into the blob, not runtime config); live
   word-by-word growth is preserved.

   *Known limitations (documented, not built for):* an unhit condition that swaps an
   item element would produce a duplicate → content-dedup is the cheap fallback if
   it ever appears; Meet eventually drops old items from its append-only history →
   irrelevant, we persist server-side under each id.

3. **Captions off by default.** Documented user step: enable captions (CC / `c`),
   pick language, *then* click the bookmarklet. If it finds no caption region it
   `console.warn`s a hint (no popup to show it in).

4. **No caption timestamps.** Meet exposes none; the server stamps arrival time on
   receipt (the bookmarklet omits it, keeping the blob small). Good enough for the
   analysis's "time per topic" heuristic. This is the `ts` field — see Data model.

## Configuration

| Var | Default | Effect |
|---|---|---|
| `PORT` | `8737` | server port / page URL |
| `ANALYZE_EVERY` | `120` | seconds between analyses per session (practical floor ~60) |
| arg 1 | `claude` | `claude` (sonnet, low effort), `opencode`, or `go-qwen` (direct zen API, `qwen3.8-flash` reasoning off) |
| `OPENCODE_API_KEY` | — | bearer key for `go-qwen`; overrides `~/.local/share/opencode/auth.json` → `["opencode-go"].key` |

Meeting id and title come from the bookmarklet per-POST — no server-side title arg.

Analysis prompt (PT-BR), sent on stdin with the transcript appended:

```
Você é um copiloto de reunião. Abaixo está a transcrição parcial de uma reunião
em andamento, gerada a partir das legendas automáticas do Google Meet (pode conter
erros de transcrição; ignore-os). Os rótulos de falante são os nomes reais dos
participantes; 'You' é o usuário local.

Responda em português, conciso, em tópicos:
1. **Tópicos discutidos** — com tempo aproximado gasto em cada um (use os timestamps)
2. **Alerta de tempo** — algum tópico está consumindo tempo demais?
3. **Contradições / pontas soltas** — afirmações conflitantes ou questões levantadas e não resolvidas
4. **Decisões e ações** — o que já foi decidido ou atribuído
5. **Perguntas sugeridas** — 2-3 perguntas que 'You' poderia fazer agora para esclarecer pontas soltas, destravar decisões ou expor contradições
6. **Desde a última análise** — o que mudou: tópicos novos, pontas soltas resolvidas, alertas que deixaram de valer
```

When a prior `analysis.txt` exists, it's prepended before the transcript so
section 6 can be computed, with this framing (else omitted):

```
Sua análise anterior (use-a só para manter nomes de tópicos consistentes e calcular
a seção 6 — re-derive todo o resto da transcrição):
<prior analysis>

Transcrição:
<transcript>
```

Reference: [`google-meet-cc-to-srt`](https://github.com/yunho0130/google-meet-cc-to-srt)
(shipping Meet-caption extension, v3.8.9) — lift its `SelectorManager` selector
table into `bookmarklet.src.js`; ignore its
capture algorithm (speaker-state/debounce/dedup — more than we need, see Hard
Problems #2) and the rest (SRT export, OpenAI, sidepanel, offscreen).

## Milestones

1. **Server skeleton** — session `Map`, `POST /m/<id>/caption` upsert (creates
   session from the path `<id>`), `GET /` list, `GET /m/<id>` page,
   `GET /m/<id>/state`, writes transcript. Test with `curl` posting fake captions
   under two ids.
2. **Analysis loop** — CLI shell-out with the prompt (see Configuration) on stdin,
   prior-analysis injection, empty-reply guard.
3. **Page** — build the static shell (see Component 3), poll `/state`.
4. **Bookmarklet** — `bookmarklet.src.js` (layered selectors + `WeakMap<Element,id>`
   per item, upsert POST on growth, ~400ms coalesce), minified to the `javascript:`
   blob. DOM behavior already validated against a two-participant call; wire it to
   the server (CORS + one-time LNA prompt).
5. **Harden** — README (install the bookmarklet, enable captions, allow LNA); add
   content-dedup only if item-element swaps ever produce duplicate lines (not
   observed in testing).

## Future ideas (not in v1)

Deliberately out of scope now; recorded so v1 doesn't paint them out. All build on
the kept-forever flat files as source of truth:

- **Search over past meetings** — a SQLite index for full-text (FTS5) and/or vector
  search across all transcripts + analyses, so the archive becomes a personal
  knowledge base a human *or an agent* can query. Derived index, rebuildable from
  the `meetings/` files.
- **History browsing** — basic browse/view of past meetings from disk shipped in
  GMC-013 (the `GET /` union + disk-backed `/state`); a richer UI wired to search
  is the remaining future work here.
- **Calendar-sourced metadata** — pull subject/agenda, invite description, attendee
  emails, organizer, and scheduled times from Google Calendar (needs Calendar API +
  a permission). This is the feature that introduces `meeting.json` as a per-meeting
  manifest — the first real *reader* of one, alongside the search index above.
- **Disposable share URLs** — expose one meeting read-only to coworkers (e.g. over
  ngrok) without handing them the guessable Meet code or access to other sessions.
  Mint an unguessable token → single meetingId, served at `GET /s/<token>` (reusing
  the static shell + `/s/<token>/state`, so the id never leaks to the client).
  Revocable/expiring, read-only (no `POST /caption`).
  **Isolate by port, not by auth checks:** a second `http.createServer` on a
  separate `SHARE_PORT` that *only* handles `/s/<token>` + `/s/<token>/state` —
  no `/`, no `/m/...`, no `/caption`. Point ngrok at that port alone. The main
  port stays localhost-only and untouched; there's nothing to enumerate because
  the share server never routes those paths. No v1 change — a second listener
  over the same in-memory sessions, added when sharing is built.

Neither changes v1's storage or routes; the server already namespaces by meeting,
which is the natural unit both features index.
