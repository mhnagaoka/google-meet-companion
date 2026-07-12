// Replay a transcript file into a running server as live captions, to
// exercise the analysis loop (prior-analysis injection, section 6) on real
// meeting data. One caption POST per line, paced by DELAY_MS.
//
// Accepted line formats: "[HH:MM Speaker] text" (our render format) or
// "Speaker: text"; anything else is sent whole with speaker "Unknown".
//
// ponytail: server stamps arrival time, so topic timing reflects the replay
// clock — use the frozen-prefix path (dev/README.md) when real timestamps matter.
//
// usage: node dev/replay.js <transcript-file> [meet-code] [delay-ms]

import fs from "node:fs"

const [file, id = "aaa-bbbb-ccc", delay = 2000] = process.argv.slice(2)
if (!file) {
  console.error(
    "usage: node dev/replay.js <transcript-file> [meet-code] [delay-ms]",
  )
  process.exit(1)
}
const url = `http://127.0.0.1:${process.env.PORT || 8737}/m/${id}/caption`
const lines = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter((l) => l.trim())

let n = 0
for (const line of lines) {
  const m =
    line.match(/^\[\S+ (.+?)\] (.*)$/) ?? line.match(/^([^:[\]]{1,40}): (.*)$/)
  const [speaker, text] = m ? [m[1], m[2]] : ["Unknown", line]
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: `replay-${n}`, speaker, text, title: "Replay" }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} at line ${n + 1}: ${line}`)
  n++
  process.stdout.write(`\r${n}/${lines.length}`)
  await new Promise((r) => setTimeout(r, Number(delay)))
}
console.log(`\nreplayed ${n} captions to ${url}`)
