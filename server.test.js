import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { createApp } from "./server.js"

const ID1 = "abc-defg-hij"
const ID2 = "klm-nopq-rst"

function start(dir = fs.mkdtempSync(path.join(os.tmpdir(), "gmc-"))) {
  const server = createApp({ dir })
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

  // transcript persisted whole on disk
  const date = new Date().toISOString().slice(0, 10)
  const onDisk = fs.readFileSync(
    path.join(dir, `${date}-${ID1}`, "transcript.txt"),
    "utf8",
  )
  assert.equal(onDisk, state.transcript)

  await stop(server)
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

  ;({ server, base } = await start(dir))
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
