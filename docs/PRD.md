# PRD — google-meet-companion

A live meeting copilot that scrapes **Google Meet captions** (instead of recording
audio) and, every couple of minutes, asks an LLM for an analysis — topics and time
spent, time alerts, contradictions and loose ends, decisions, suggested questions,
and what changed since the last analysis.

Successor to `meeting-companion` (the "original"), which captured mic + speaker
loopback and transcribed locally with Whisper/voxtype. This project replaces that
entire audio pipeline with Meet's own captions.

```
Bookmarklet (clicked once per call on meet.google.com)
  MutationObserver on the captions DOM
    → POST /caption {meetingId, title, id, speaker, text, seq}   (upsert)
      → local Node server (localhost:8737), one long-lived process
          • Map<meetingId, session>: ordered utterance map (+ transcript.txt)
          • per-session analysis loop → analysis.txt  (LLM every N sec if changed)
          • serves a side-by-side page per meeting, polled by the browser
```

The Meet code (`meet.google.com/abc-defg-hij` → `abc-defg-hij`) is the session
key, so one server tracks many meetings concurrently — join any call and it's
picked up automatically.

Everything runs locally except the LLM call.

## Why this over the original

Meet captions hand us, for free, the two things that were the original's whole
hard part:

- **Real speaker names.** Meet labels each caption with the participant. The
  original could only say `you`/`remote`; here we get true diarization for nothing.
- **No local ML / GPU / audio deps.** parec, ffmpeg, voxtype, 30s chunking,
  hallucination filtering — all gone. What remains is a bookmarklet, a small
  HTTP server, and the analysis loop (largely unchanged from the original).

## Goals

1. Capture Meet captions live, with speaker names, handling in-place updates.
2. Persist a running transcript per meeting.
3. Run the original's analysis loop against that transcript via the `claude` /
   `opencode` CLI.
4. Serve a side-by-side page (transcript left, analysis right) at `localhost:8737`.

## Non-goals

- No audio capture / local ASR of any kind (dropped deliberately).
- No verbatim minutes — captions are lossy; this is a copilot, not a court record.
- No cloud service, no auth, no multi-user. Single local user, one meeting per port.
- No forcing captions on — user enables them (documented step).

## Decisions (locked)

| Area | Choice | Note |
|---|---|---|
| Capture | Meet captions only | Audio pipeline dropped entirely |
| Server | Node.js, stdlib `http` only | No framework; one language would-be nice but server stays dep-free |
| LLM | shell out to `claude` / `opencode` CLI | Same as original; no API key to manage |
| UI refresh | browser polls `GET /m/<id>/state` | Lazy default; SSE only if polling proves twitchy |
| Session model | one long-lived server, keyed by Meet code | Tracks many meetings at once; `node server.js [claude\|opencode]`, no title arg |

## Components

### 1. Bookmarklet (self-contained inline blob)

Delivery mechanism decided in [ADR-0001](adr/0001-caption-delivery-mechanism.md)
(bookmarklet over MV3 extension; a server-loaded `<script>` is impossible under
Meet's Trusted Types, `fetch+eval` parked).

- Clicked **once per call** after captions are on (`c`). No auto-injection, no
  manifest, no permissions review — the whole MV3 scaffold is gone.
- A `MutationObserver` watches the captions region; each caption item is tagged via
  `WeakMap<Element,id>` and POSTed as an upsert as its text grows (see Hard
  Problems #2 for the model).
- Reads the **Meet code** from `location.pathname` and the **title** from
  `document.title`; both ride on every POST.
- **Identity (per-item id) lives here, not in the server** (see Hard Problems).
- Transport: `fetch('http://localhost:8737/caption', {method:'POST', body:JSON})`.
  HTTPS→`http://localhost` is permitted (localhost is treated as trustworthy).
  First run per origin, Chrome prompts once for **Local Network Access** ("Allow");
  granted, it persists — a documented one-time step, like enabling captions.
  Failed POST (server down) is dropped silently — no buffering (YAGNI until it hurts).
- No popup (a bookmarklet has none); the server URL is baked into the blob.
- Self-contained (~1 KB minified); no server-loaded code. Keep the readable source
  in the repo (`bookmarklet.src.js`), minify to the `javascript:` blob on build.
  All DOM selectors up top so a Meet DOM change is a one-line edit + re-minify.

### 2. Node server (`server.js`, stdlib only)

- Keeps `Map<meetingId, session>`; a session is created on first `POST /caption`
  for a code.
- `POST /caption` — upsert `{meetingId, title, id, speaker, text, seq}` into that
  session's ordered Map.
- `GET /` — lists active meetings (link to each `/m/<id>`).
- `GET /m/<id>` — serves a **constant** HTML+JS shell, identical bytes for every
  `<id>`. No server-side rendering: `<id>` never appears in the HTML, only in the
  URL the shell's JS polls. So this route ignores `<id>` and returns one fixed
  string (the ported `index.html`, read once at startup or inlined).
- `GET /m/<id>/state` — JSON `{title, transcript, analysis, updatedAt}` for polling.
- **CORS for the bookmarklet:** `POST /caption` comes cross-origin from
  `https://meet.google.com`, so respond with `Access-Control-Allow-Origin: *`,
  `Access-Control-Allow-Headers: Content-Type`, `Access-Control-Allow-Methods:
  POST, OPTIONS`, and answer the `OPTIONS` preflight with `204`. ~6 lines. (No
  `Allow-Private-Network` header — verified inert on current Chrome; the gate is
  the client-side one-time LNA prompt, not a server header. See ADR-0001.)

All routes share one `<id>` parser — a single
`req.url.match(/^\/m\/([^/]+)(\/state)?$/)` plus a couple of `if`s on `req.url`,
not a route table or framework (stdlib `http` only).
- Writes `meetings/<date>-<id>/transcript.txt` and `analysis.txt` (`meetings/`
  git-ignored). Date in the dir since recurring Meet codes repeat across days;
  in-memory session keys on `id` alone (one live at a time).
- **Analysis loop:** one `setInterval(ANALYZE_EVERY)` per session; if that
  session's transcript changed since last run, spawn the CLI with the prompt **on
  stdin** (avoids ARG_MAX on long transcripts), write to its `analysis.txt`. An
  empty reply must not clobber the last good analysis (ported guard).

### 3. The page (`index.html`)

- Ports from the original: transcript left, analysis (markdown) right.
- **Static shell, client-derived id.** The same HTML served for every meeting;
  the JS reads `<id>` from `location.pathname` (same trick the extension uses on
  the Meet side) and builds its own `/m/<id>/state` URL.
- Polls that `/state` every ~2s. `ponytail:` re-render is gated on `updatedAt` —
  skip it when unchanged (idle call → no work; analysis is byte-identical between
  the ~120s runs). Ceiling: full transcript re-render on a long call; upgrade path
  is a `seq` high-water cursor + append, only if the tail ever janks.

## Data model

An utterance (within a session keyed by `meetingId`):

```
{ id: string,        // per caption item (speaker turn), from WeakMap<Element,id>
  seq: number,        // monotonic first-seen order, for sorting
  speaker: string,    // Meet participant name ("You" for the local user)
  text: string,       // item's current text; grows live, upsert replaces by id
  ts: "HH:MM" }       // server arrival time (Meet exposes no caption time)
```

Every `POST /caption` also carries `meetingId` (Meet code) and `title` (for
display); the server routes it to the matching session, creating one on first sight.

`ts` is the single home of the timestamp. The `[HH:MM Speaker] text` line
(ordered by `seq`) is **derived on read** — materialized for `/state` and appended
to `transcript.txt`, never cached as a separate in-memory string. The utterance
stays structured (not a flat pre-rendered line) because upsert replaces by `id`.

## Local storage

Two layers.

**In-memory** (`Map<meetingId, session>`, lost on exit): `meetingId`, `title`, the
ordered utterance map (`{id, seq, speaker, text, ts}` per row), the last analysis
text + `updatedAt`, and the analysis loop's bookkeeping (last transcript size seen).

**On-disk**, under `meetings/<date>-<id>/` (**git-ignored**, kept forever — never
pruned):

- `transcript.txt` — rendered `[HH:MM Speaker] text` lines in `seq` order.
- `analysis.txt` — latest good LLM analysis (markdown).

No `meeting.json` in v1. Every field it would hold is already available without
storing it: `meetingId`/`url` from the dirname, `title` from the transcript
header (or `/state`), `llm` from the launch arg, `participants` as
`[...new Set(speakers)]` derived from the transcript at read time. It's a cache
of things we already have — write it when a *reader* exists (the deferred
Calendar/index feature, see Future ideas), not before.

**Metadata sources — what's free vs what isn't:**

- *Free from the transcript* (no extra scraping): id, title, url, timestamps,
  and participants **as distinct caption speakers** — all derivable from what
  we already capture.
- *Not worth scraping for v1 — full roster incl. silent attendees:* would need
  the participants panel, a second obfuscated Meet DOM anchor with its own
  join/leave churn, to add names the analysis never uses (it reasons over the
  transcript; silent attendees contribute no lines). Easy follow-up if a reader
  ever needs it — not by scraping unless it earns its keep.
- *Not on the Meet page at all — Calendar only:* subject/agenda, invite
  description, attendee **emails**, organizer, scheduled start/end. These require
  Google Calendar integration (extra permission + real work) and are **deferred
  to future** (see Future ideas), not blocking v1.

Not stored: no audio (there is none), no interim caption history (upsert-by-id keeps
only each item's latest text, which converges to the finalized turn).

The flat files are the source of truth. Any future index (see Future ideas) is a
*derived* artifact rebuildable from them, so it doesn't constrain v1.

Both of the below were **verified empirically** against a live **two-participant**
Meet call (probe + `MutationObserver` via Chrome DevTools; PT-BR test script in
`dev/`), and the selector strategy cross-checked against a shipping reference
extension (`google-meet-cc-to-srt`, v3.8.9). The two former Open Questions are now
resolved; findings folded in here. **Step-by-step DOM behavior with the recorded
timeline: [`../dev/dom-behavior.md`](../dev/dom-behavior.md).**

1. **Caption DOM is fragile / obfuscated.** Confirmed anchor: the captions live in
   `[role="region"][aria-label*="caption" i]`. Use a **layered selector list** in
   `bookmarklet.src.js`, first match wins:
   - `[role="region"][aria-label*="caption" i]` — primary (English UI).
   - localized `aria-label` variants (pt "legenda", ko "자막", "subtitle", …) —
     `aria-label` is localized to the user's Meet UI language.
   - `[jsname="dsyhDe"]` — jsname fallback when a locale substring is missed.
   Within the region, one **item per speaker turn** (`.nMcdL.bj4p3b`), each holding
   speaker (`.NWpY1d`) + text (`.ygicle.VbkSUe`). Obfuscated classes are the precise
   primary; a class-free fallback (region child with an avatar `<img>`, then
   `innerText.split('\n')` → `[speaker, ...text]`) survives a class rename. Keep an
   **exclude list** (`[role="dialog"]`, `button`, mute/camera controls) so the
   observer ignores non-caption UI. All of it in `bookmarklet.src.js`; one-file maintenance.

2. **Update-vs-append + rolling window (the actual hard part).** Verified behavior:
   - Each **caption item is one speaker turn** — a stable element that grows text in
     place across multiple sentences *and* multi-second pauses; a new item starts on
     **speaker change**, not on pause. (A long uninterrupted turn = one long item =
     one transcript line with a single start-`ts`; fine for v1.)
   - Items **accumulate append-only** in the DOM (a rolling history — 17 lines seen
     coexisting), each frozen once finalized. **No interim→final element swap and no
     duplicates** observed (17 clean distinct final lines).
   - **Concurrent speakers → multiple items grow simultaneously** (confirmed: two
     items updating at once during overlapping speech).

   So the item element is a clean, stable identity — the original plan holds, keyed
   on the **item element**: tag each `.nMcdL.bj4p3b` via `WeakMap<Element,id>`; on
   mutation, upsert `{id, speaker, text}` (the item's full current text) to the
   server, which **just replaces by id**. Item grows → same id → text replaced;
   freezes → last text sticks; new turn → new item → new id. Concurrent speakers
   fall out for free (independent items). **No debounce, no dedup, no server-side
   fuzzy-merge** — the element *is* the identity (the reference extension needs those
   only because it buffers lines for file export; we stream to a hold-latest-per-id
   server). Live word-by-word growth is preserved; coalesce per-item POSTs with a
   light ~400ms trailing debounce purely to cut transport chatter, not for identity.

   Residual low risks, documented not built for: an unhit condition that swaps an
   item element would dupe → content-dedup is the cheap fallback if it ever appears;
   the append-only history is dropped by Meet eventually → irrelevant, we persist
   server-side under each id.

3. **Captions off by default.** Documented user step: enable captions (CC / `c`),
   pick language, *then* click the bookmarklet. If it finds no caption region it
   `console.warn`s a hint (no popup to show it in).

4. **No caption timestamps.** Server stamps arrival time on receipt (bookmarklet
   omits it — keeps the blob small); good enough for the analysis's "time per
   topic" heuristic.

## Configuration

| Var | Default | Effect |
|---|---|---|
| `PORT` | `8737` | server port / page URL |
| `ANALYZE_EVERY` | `120` | seconds between analyses per session (practical floor ~60) |
| `POST_COALESCE` | `~400` | ms trailing debounce coalescing per-item POSTs (bookmarklet-side, transport only) |
| arg 1 | `claude` | `claude` (sonnet, low effort) or `opencode` |

Meeting id and title come from the bookmarklet per-POST — no server-side title arg.

Analysis prompt: port the original's PT-BR prompt verbatim (topics+time, time
alert, contradictions/loose ends, decisions/actions, suggested questions, "since
last analysis"). Speaker labels are now real names (`"You"` for the local user).

Reference: `../google-meet-cc-to-srt` (shipping Meet-caption extension, v3.8.9) —
lift its `SelectorManager` selector table into `bookmarklet.src.js`; ignore its
capture algorithm (speaker-state/debounce/dedup — more than we need, see Hard
Problems #2) and the rest (SRT export, OpenAI, sidepanel, offscreen).

## Milestones

1. **Server skeleton** — session `Map`, `POST /caption` upsert (creates session by
   `meetingId`), `GET /` list, `GET /m/<id>` page, `GET /m/<id>/state`, writes
   transcript. Test with `curl` posting fake captions under two ids.
2. **Analysis loop** — port prompt + CLI shell-out + empty-reply guard.
3. **Page** — port `index.html`, poll `/state`.
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
- **History browsing** — a UI to browse past meetings, wired to that search.
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
