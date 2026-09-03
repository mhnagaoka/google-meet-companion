import assert from "node:assert/strict"
import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { createApp } from "./server.js"

const ID1 = "abc-defg-hij"
const ID2 = "klm-nopq-rst"

function start(opts = {}) {
  const dir = opts.dir ?? fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const server = createApp({ ...opts, dir })
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        base: `http://127.0.0.1:${server.address().port}`,
        dir,
      })
    })
  })
}

const stop = (server) => new Promise((r) => server.close(r))

// fake CLI: node -e <script>, so no real claude/opencode is ever spawned
const fakeCli = (script, timeout) => ({
  cmd: process.execPath,
  args: ["-e", script],
  timeout,
})

async function until(fn, ms = 3000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await fn()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error("condition not met in time")
}

const postCaption = (base, meeting, body) =>
  fetch(`${base}/m/${meeting}/caption`, {
    method: "POST",
    body: JSON.stringify(body),
  })

test("caption upsert, ordering, and state round-trip", async () => {
  const { server, base, dir } = await start()

  let res = await postCaption(base, ID1, {
    title: "Standup",
    id: "u1",
    speaker: "Alice",
    text: "hello",
  })
  assert.equal(res.status, 204)
  await postCaption(base, ID1, { id: "u2", speaker: "Bob", text: "hi" })
  // upsert: u1 grows in place, keeps its position
  await postCaption(base, ID1, {
    id: "u1",
    speaker: "Alice",
    text: "hello world",
  })

  res = await fetch(`${base}/m/${ID1}/state`)
  assert.equal(res.status, 200)
  const state = await res.json()
  assert.equal(state.title, "Standup")
  assert.ok(state.updatedAt)
  const lines = state.transcript.trimEnd().split("\n")
  assert.equal(lines[0], `# Standup — ${ID1}`)
  assert.match(lines[1], /^\[\d\d:\d\d Alice\] hello world$/)
  assert.match(lines[2], /^\[\d\d:\d\d Bob\] hi$/)

  // transcript hits disk on the shutdown flush (per-POST writes are gone)
  await stop(server)
  const date = new Date().toISOString().slice(0, 10)
  const onDisk = fs.readFileSync(
    path.join(dir, `${date}-${ID1}`, "transcript.txt"),
    "utf8",
  )
  assert.equal(onDisk, state.transcript)
})

test("two ids get isolated sessions and GET / lists both", async () => {
  const { server, base } = await start()

  await postCaption(base, ID1, {
    title: "A",
    id: "u1",
    speaker: "X",
    text: "one",
  })
  await postCaption(base, ID2, {
    title: "B",
    id: "u1",
    speaker: "Y",
    text: "two",
  })

  const s1 = await (await fetch(`${base}/m/${ID1}/state`)).json()
  const s2 = await (await fetch(`${base}/m/${ID2}/state`)).json()
  assert.match(s1.transcript, /one/)
  assert.doesNotMatch(s1.transcript, /two/)
  assert.match(s2.transcript, /two/)

  const index = await (await fetch(`${base}/`)).text()
  assert.match(index, new RegExp(`/m/${ID1}`))
  assert.match(index, new RegExp(`/m/${ID2}`))

  await stop(server)
})

test("strict id parser 404s everything else", async () => {
  const { server, base } = await start()

  for (const url of [
    "/m/../etc/caption",
    "/m/ABC-DEFG-HIJ/caption",
    "/m/abc-defg-hijk/caption",
    "/m/abc-defg-hij/other",
    "/nope",
  ]) {
    const res = await fetch(base + url, { method: "POST", body: "{}" })
    assert.equal(res.status, 404, url)
  }
  // unknown-but-valid id: state 404s, shell still serves
  assert.equal((await fetch(`${base}/m/${ID1}/state`)).status, 404)
  assert.equal((await fetch(`${base}/m/${ID1}`)).status, 200)

  await stop(server)
})

test("malformed and oversized bodies are rejected, process survives", async () => {
  const { server, base } = await start()

  let res = await fetch(`${base}/m/${ID1}/caption`, {
    method: "POST",
    body: "not json",
  })
  assert.equal(res.status, 400)
  res = await fetch(`${base}/m/${ID1}/caption`, {
    method: "POST",
    body: JSON.stringify({ id: 42, text: "bad shape" }),
  })
  assert.equal(res.status, 400)
  res = await fetch(`${base}/m/${ID1}/caption`, {
    method: "POST",
    body: `{"id":"u1","text":"${"x".repeat(70 * 1024)}"}`,
  })
  assert.equal(res.status, 413)
  // server still alive
  res = await postCaption(base, ID1, { id: "u1", speaker: "A", text: "ok" })
  assert.equal(res.status, 204)

  await stop(server)
})

test("CORS pinned to meet.google.com, preflight answers 204", async () => {
  const { server, base } = await start()

  const pre = await fetch(`${base}/m/${ID1}/caption`, { method: "OPTIONS" })
  assert.equal(pre.status, 204)
  assert.equal(
    pre.headers.get("access-control-allow-origin"),
    "https://meet.google.com",
  )

  const post = await postCaption(base, ID1, {
    id: "u1",
    speaker: "A",
    text: "x",
  })
  assert.equal(
    post.headers.get("access-control-allow-origin"),
    "https://meet.google.com",
  )

  await stop(server)
})

test("shell is identical bytes for every id", async () => {
  const { server, base } = await start()

  const a = await (await fetch(`${base}/m/${ID1}`)).text()
  const b = await (await fetch(`${base}/m/${ID2}`)).text()
  assert.equal(a, b)
  assert.doesNotMatch(a, new RegExp(ID1))

  await stop(server)
})

test("analysis tick survives disk failure, memory keeps serving", async () => {
  const { server, base, dir } = await start({
    every: 25,
    llm: fakeCli("process.stdin.pipe(process.stdout)"),
  })

  await postCaption(base, ID1, {
    title: "Standup",
    id: "u1",
    speaker: "Alice",
    text: "memory only",
  })
  // make every write in the tick throw: session dir becomes a plain file
  const date = new Date().toISOString().slice(0, 10)
  const sdir = path.join(dir, `${date}-${ID1}`)
  fs.rmSync(sdir, { recursive: true })
  fs.writeFileSync(sdir, "")

  // the tick still analyzes (memory ahead of disk) and the process survives
  const state = () => fetch(`${base}/m/${ID1}/state`).then((r) => r.json())
  await until(async () => (await state()).analysis)
  assert.match((await state()).analysis, /memory only/)
  const res = await postCaption(base, ID1, {
    id: "u2",
    speaker: "B",
    text: "x",
  })
  assert.equal(res.status, 204)

  await stop(server)
})

test("restart recovery: existing transcript becomes a frozen prefix", async () => {
  let { server, base, dir } = await start()
  await postCaption(base, ID1, {
    title: "Standup",
    id: "u1",
    speaker: "Alice",
    text: "before restart",
  })
  const before = (await (await fetch(`${base}/m/${ID1}/state`)).json())
    .transcript
  await stop(server)

  ;({ server, base } = await start({ dir }))
  await postCaption(base, ID1, {
    title: "Standup",
    id: "u1",
    speaker: "Alice",
    text: "after restart",
  })
  const after = (await (await fetch(`${base}/m/${ID1}/state`)).json())
    .transcript
  assert.ok(after.startsWith(before), "pre-restart lines survive as prefix")
  assert.match(after, /after restart/)
  // header not duplicated by the recovered prefix
  assert.equal(after.match(/^# Standup/gm).length, 1)

  await stop(server)
})

test("analysis loop: dirty gating, prompt on stdin, prior-analysis injection", async () => {
  // echo CLI: the "analysis" is the exact prompt received on stdin
  const { server, base, dir } = await start({
    every: 25,
    llm: fakeCli("process.stdin.pipe(process.stdout)"),
  })
  const state = () => fetch(`${base}/m/${ID1}/state`).then((r) => r.json())

  await postCaption(base, ID1, {
    title: "Standup",
    id: "u1",
    speaker: "Alice",
    text: "primeiro assunto",
  })
  await until(async () => (await state()).analysis)

  const first = (await state()).analysis
  assert.match(first, /Você é um copiloto de reunião/)
  assert.match(first, /Transcrição:\n# Standup/)
  assert.match(first, /primeiro assunto/)
  assert.doesNotMatch(first, /Sua análise anterior/) // no prior on first run

  // tick rewrote transcript.txt and persisted analysis.txt
  const date = new Date().toISOString().slice(0, 10)
  const sdir = path.join(dir, `${date}-${ID1}`)
  assert.match(
    fs.readFileSync(path.join(sdir, "transcript.txt"), "utf8"),
    /primeiro assunto/,
  )
  assert.equal(fs.readFileSync(path.join(sdir, "analysis.txt"), "utf8"), first)

  // clean session: several ticks later, no re-run (echo output would differ)
  await new Promise((r) => setTimeout(r, 100))
  assert.equal((await state()).analysis, first)

  // new caption re-dirties; next run gets the prior analysis injected
  await postCaption(base, ID1, { id: "u2", speaker: "Bob", text: "segundo" })
  await until(async () => (await state()).analysis !== first)
  const second = (await state()).analysis
  assert.match(second, /Sua análise anterior/)
  assert.ok(second.includes(first), "prior analysis rides in the prompt")
  assert.match(second, /segundo/)

  await stop(server)
})

test("empty reply never clobbers the last good analysis.txt", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const m1 = JSON.stringify(path.join(dir, "ran-once"))
  const m2 = JSON.stringify(path.join(dir, "ran-twice"))
  // first run: good analysis; second run: exits silently, leaving a marker
  const { server, base } = await start({
    dir,
    every: 25,
    llm: fakeCli(
      `const f=require('fs');if(f.existsSync(${m1})){f.writeFileSync(${m2},'')}else{f.writeFileSync(${m1},'');console.log('boa análise')}`,
    ),
  })
  const state = () => fetch(`${base}/m/${ID1}/state`).then((r) => r.json())

  await postCaption(base, ID1, { id: "u1", speaker: "A", text: "olá" })
  await until(async () => (await state()).analysis)
  await postCaption(base, ID1, { id: "u2", speaker: "B", text: "oi" })
  await until(() => fs.existsSync(JSON.parse(m2)))
  await new Promise((r) => setTimeout(r, 100)) // let the empty run settle

  assert.equal((await state()).analysis, "boa análise")
  const date = new Date().toISOString().slice(0, 10)
  assert.equal(
    fs.readFileSync(path.join(dir, `${date}-${ID1}`, "analysis.txt"), "utf8"),
    "boa análise",
  )

  await stop(server)
})

test("in-flight blocks concurrent runs; timeout kills a hung CLI and frees it", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const log = JSON.stringify(path.join(dir, "spawns"))
  // every spawn logs one byte, then hangs until spawn's { timeout } kills it
  const { server, base } = await start({
    dir,
    every: 25,
    llm: fakeCli(
      `require('fs').appendFileSync(${log},'x');setTimeout(()=>{},60000)`,
      400,
    ),
  })
  const spawns = () => {
    try {
      return fs.readFileSync(JSON.parse(log), "utf8").length
    } catch {
      return 0
    }
  }

  await postCaption(base, ID1, { id: "u1", speaker: "A", text: "um" })
  await until(() => spawns() === 1)
  // captions during the in-flight run set dirty again but spawn nothing
  await postCaption(base, ID1, { id: "u2", speaker: "B", text: "dois" })
  await new Promise((r) => setTimeout(r, 100))
  assert.equal(spawns(), 1, "no concurrent run while one is in flight")

  // the killed run frees the flag: the mid-run caption triggers the next run
  await until(() => spawns() === 2)
  // a killed (empty) reply never became the analysis
  const state = await (await fetch(`${base}/m/${ID1}/state`)).json()
  assert.equal(state.analysis, "")

  await stop(server)
})

test("GET / lists disk-only meetings with title from transcript", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const date = new Date().toISOString().slice(0, 10)
  const sdir = path.join(dir, `${date}-${ID1}`)
  fs.mkdirSync(sdir, { recursive: true })
  fs.writeFileSync(
    path.join(sdir, "transcript.txt"),
    `# Past Standup — ${ID1}\n[10:00 Alice] hello\n`,
  )

  const { server, base } = await start({ dir })
  const index = await (await fetch(`${base}/`)).text()
  assert.match(index, new RegExp(`/m/${ID1}`))
  assert.match(index, /<a href="\/m\/abc-defg-hij">Past Standup<\/a>/)

  await stop(server)
})

test("GET /m/<id>/state reads disk-only meeting without creating a session", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const marker = path.join(dir, "analyzed")
  const date = new Date().toISOString().slice(0, 10)
  const sdir = path.join(dir, `${date}-${ID1}`)
  fs.mkdirSync(sdir, { recursive: true })
  fs.writeFileSync(
    path.join(sdir, "transcript.txt"),
    `# Old Meeting — ${ID1}\n[09:00 Bob] saved line\n`,
  )
  fs.writeFileSync(path.join(sdir, "analysis.txt"), "saved analysis")

  const { server, base } = await start({
    dir,
    every: 25,
    llm: fakeCli(
      `require('fs').writeFileSync(${JSON.stringify(marker)},'');process.stdin.pipe(process.stdout)`,
    ),
  })

  const res = await fetch(`${base}/m/${ID1}/state`)
  assert.equal(res.status, 200)
  const state = await res.json()
  assert.equal(state.title, "Old Meeting")
  assert.match(state.transcript, /saved line/)
  assert.equal(state.analysis, "saved analysis")
  assert.ok(state.updatedAt)

  // No analyze tick should fire for a view-only load.
  await new Promise((r) => setTimeout(r, 100))
  assert.equal(
    fs.existsSync(marker),
    false,
    "view-only load must not spawn an analysis",
  )

  // Repeated reads stay view-only and keep returning the saved analysis.
  const state2 = await (await fetch(`${base}/m/${ID1}/state`)).json()
  assert.equal(state2.analysis, "saved analysis")

  await stop(server)
})

test("go-qwen fetch path calls zen endpoint and writes analysis.txt", async () => {
  const key = `test-key-${Date.now()}`
  const received = { headers: null, body: null }

  const mock = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404).end()
      return
    }
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      received.headers = req.headers
      received.body = JSON.parse(body)
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "mocked zen analysis",
              },
            },
          ],
        }),
      )
    })
  })

  await new Promise((r) => mock.listen(0, "127.0.0.1", r))
  const mockBase = `http://127.0.0.1:${mock.address().port}`

  const oldKey = process.env.OPENCODE_API_KEY
  process.env.OPENCODE_API_KEY = key
  try {
    const { server, base, dir } = await start({
      every: 25,
      llm: {
        url: `${mockBase}/v1/chat/completions`,
        model: "qwen3.7-plus",
        thinking: { type: "disabled" },
      },
    })
    const state = () => fetch(`${base}/m/${ID1}/state`).then((r) => r.json())

    await postCaption(base, ID1, {
      title: "Standup",
      id: "u1",
      speaker: "Alice",
      text: "assunto",
    })
    await until(async () => (await state()).analysis)

    assert.equal((await state()).analysis, "mocked zen analysis")
    assert.equal(received.headers.authorization, `Bearer ${key}`)
    assert.equal(received.headers["x-opencode-session"], ID1)
    assert.equal(received.body.model, "qwen3.7-plus")
    assert.deepEqual(received.body.thinking, { type: "disabled" })
    assert.equal(received.body.messages[0].role, "user")
    assert.match(
      received.body.messages[0].content,
      /Você é um copiloto de reunião/,
    )
    assert.match(received.body.messages[0].content, /assunto/)

    const date = new Date().toISOString().slice(0, 10)
    assert.equal(
      fs.readFileSync(path.join(dir, `${date}-${ID1}`, "analysis.txt"), "utf8"),
      "mocked zen analysis",
    )

    await stop(server)
  } finally {
    process.env.OPENCODE_API_KEY = oldKey
    await new Promise((r) => mock.close(r))
  }
})

test("go-qwen fetch path keeps last good analysis on empty response", async () => {
  let calls = 0
  const mock = http.createServer((req, res) => {
    calls++
    let body = ""
    req.on("data", (c) => (body += c))
    req.on("end", () => {
      res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: calls === 1 ? "boa análise" : "",
              },
            },
          ],
        }),
      )
    })
  })

  await new Promise((r) => mock.listen(0, "127.0.0.1", r))
  const mockBase = `http://127.0.0.1:${mock.address().port}`

  const oldKey = process.env.OPENCODE_API_KEY
  process.env.OPENCODE_API_KEY = "key"
  try {
    const { server, base, dir } = await start({
      every: 25,
      llm: {
        url: `${mockBase}/v1/chat/completions`,
        model: "qwen3.7-plus",
        thinking: { type: "disabled" },
      },
    })
    const state = () => fetch(`${base}/m/${ID1}/state`).then((r) => r.json())

    await postCaption(base, ID1, { id: "u1", speaker: "A", text: "olá" })
    await until(async () => (await state()).analysis)

    await postCaption(base, ID1, { id: "u2", speaker: "B", text: "oi" })
    await until(() => calls === 2)
    await new Promise((r) => setTimeout(r, 100))

    assert.equal((await state()).analysis, "boa análise")
    const date = new Date().toISOString().slice(0, 10)
    assert.equal(
      fs.readFileSync(path.join(dir, `${date}-${ID1}`, "analysis.txt"), "utf8"),
      "boa análise",
    )

    await stop(server)
  } finally {
    process.env.OPENCODE_API_KEY = oldKey
    await new Promise((r) => mock.close(r))
  }
})

test("getSession recovers analysis.txt and updatedAt on rejoin", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))
  const date = new Date().toISOString().slice(0, 10)
  const sdir = path.join(dir, `${date}-${ID1}`)
  fs.mkdirSync(sdir, { recursive: true })
  fs.writeFileSync(
    path.join(sdir, "transcript.txt"),
    `# Rejoin — ${ID1}\n[08:00 Alice] earlier\n`,
  )
  fs.writeFileSync(path.join(sdir, "analysis.txt"), "previous analysis")

  const { server, base } = await start({ dir })
  const before = await (await fetch(`${base}/m/${ID1}/state`)).json()
  assert.equal(before.analysis, "previous analysis")
  assert.ok(before.updatedAt)

  // A caption POST rejoins and keeps the prior analysis in the live session.
  await postCaption(base, ID1, {
    id: "u1",
    speaker: "Bob",
    text: "after rejoin",
  })
  const after = await (await fetch(`${base}/m/${ID1}/state`)).json()
  assert.equal(after.analysis, "previous analysis")
  assert.match(after.transcript, /after rejoin/)

  await stop(server)
})
