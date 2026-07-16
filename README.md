# Google Meet Companion

A local, single-process Node server that ingests live Google Meet captions and
runs a rolling LLM analysis of the conversation. Captions are captured by a
bookmarklet you click once per call; the server serves a side-by-side page
(transcript left, analysis right) at `http://localhost:8737`.

See [`docs/PRD.md`](docs/PRD.md) for the full design and
[`dev/dom-behavior.md`](dev/dom-behavior.md) for how Meet's caption DOM behaves.

## Prerequisites

- **Node.js >= 24** (uses stdlib-only ESM; no runtime dependencies).
- **A backend** for the analysis loop, one of:
  - `claude` (default) — CLI, invoked as `claude -p --model sonnet --effort low`.
  - `opencode` — CLI, invoked as `opencode run`.
  - `go-qwen` — direct HTTP call to opencode's zen Go endpoint (`qwen3.7-plus`,
    reasoning off), no CLI spawned. Needs a key: `OPENCODE_API_KEY`, or
    `~/.local/share/opencode/auth.json` → `["opencode-go"].key`.
- **Google Chrome** (or a Chromium browser) to run the bookmarklet.

## Setup

```sh
git clone git@github.com:mhnagaoka/google-meet-companion.git
cd google-meet-companion
npm install          # dev-only (Biome); the server itself needs no packages
npm run build:bookmarklet
```

`build:bookmarklet` writes `bookmarklet.min.js` — the single-line `javascript:`
blob you install below.

## Run the server

```sh
npm start            # uses the claude CLI
# or pick a backend:
node server.js opencode
node server.js go-qwen   # direct zen API call; needs OPENCODE_API_KEY or auth.json
```

The server listens on `http://127.0.0.1:8737` (localhost only — transcripts are
never exposed to the LAN). Open that URL to see the meetings list; each meeting
gets a live transcript + analysis page once captions start arriving.

Config via env vars: `PORT` (default `8737`), `ANALYZE_EVERY` (seconds between
analyses, default `120`, practical floor ~60).

## Install the bookmarklet

1. Open `bookmarklet.min.js` and copy its entire contents (starts with
   `javascript:`).
2. In Chrome, create a new bookmark (right-click the bookmarks bar → *Add
   page*), name it e.g. **Meet Companion**, and paste the blob as the **URL**.

The server URL (`http://localhost:8737`) is baked into the blob. If you change
`PORT`, re-run `npm run build:bookmarklet` after editing `SERVER` in
`bookmarklet.src.js`.

## Use it in a call

1. Start the server (`npm start`).
2. Join the Meet call and **turn captions on** (CC button, or press `c`) — pick
   your language.
3. Click the **Meet Companion** bookmark **once**.
   - The first time, Chrome shows a one-time **Local Network Access** prompt
     ("Allow") because the page (`meet.google.com`) is POSTing to `localhost`.
     Click *Allow*; it persists.
   - If you clicked before captions were on, you'll see a `[GMC]` warning in the
     DevTools console — turn captions on and click again.
4. Open `http://localhost:8737`, click the meeting, and watch the transcript
   fill in with a periodic analysis alongside it.

If the server is down when you click, POSTs are dropped silently (no buffering)
— just start the server and click again.

## Development

```sh
npm test             # node --test
npm run check        # biome check --write .
```

Development tasks are tracked with [Backlog.md](https://backlog.md); the
per-task branch/merge workflow lives in `CLAUDE.md` (aka `AGENTS.md`).

Bookmarklet source lives in `bookmarklet.src.js` (readable, with all DOM
selectors declared up top); edit it and re-run `npm run build:bookmarklet`. A
Meet DOM change is a one-line selector edit + re-minify.
