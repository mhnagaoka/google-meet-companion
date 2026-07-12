import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Strict Meet-code parser: <id> is cross-origin input that becomes a
// filesystem path, so anything else 404s before touching disk or the Map.
const ROUTE = /^\/m\/([a-z]{3}-[a-z]{4}-[a-z]{3})(\/caption|\/state)?$/
const MAX_BODY = 64 * 1024
const CORS = {
  "Access-Control-Allow-Origin": "https://meet.google.com",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Constant shell, identical bytes for every id (real page is GMC-003).
const SHELL =
  "<!doctype html><meta charset=utf-8><title>google-meet-companion</title><p>Meeting page coming soon."

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function createApp({ dir = "meetings" } = {}) {
  const sessions = new Map()

  function getSession(id, title) {
    let s = sessions.get(id)
    if (!s) {
      const date = new Date().toISOString().slice(0, 10)
      const sdir = path.join(dir, `${date}-${id}`)
      fs.mkdirSync(sdir, { recursive: true })
      // Restart recovery: a pre-existing transcript becomes a frozen
      // prefix so rewrite-whole can't clobber the pre-restart lines.
      let prefix = ""
      try {
        prefix = fs.readFileSync(path.join(sdir, "transcript.txt"), "utf8")
        if (prefix && !prefix.endsWith("\n")) prefix += "\n"
      } catch {}
      s = {
        id,
        title: title || id,
        dir: sdir,
        utterances: new Map(),
        prefix,
        analysis: "",
        updatedAt: null,
      }
      sessions.set(id, s)
    }
    if (title) s.title = title
    return s
  }

  function render(s) {
    let out = s.prefix || `# ${s.title} — ${s.id}\n`
    for (const u of s.utterances.values())
      out += `[${u.ts} ${u.speaker}] ${u.text}\n`
    return out
  }

  function handleCaption(req, res, id) {
    if (req.method === "OPTIONS") return res.writeHead(204, CORS).end()
    if (req.method !== "POST") return res.writeHead(404).end()
    let body = ""
    req.on("data", (chunk) => {
      body += chunk
      if (body.length > MAX_BODY) {
        res.writeHead(413, CORS).end()
        req.destroy()
      }
    })
    req.on("end", () => {
      if (res.writableEnded) return
      let data
      try {
        data = JSON.parse(body)
        if (typeof data.id !== "string" || typeof data.text !== "string")
          throw new Error("bad shape")
      } catch {
        return res.writeHead(400, CORS).end()
      }
      const s = getSession(id, data.title)
      const u = s.utterances.get(data.id)
      if (u) {
        u.speaker = data.speaker
        u.text = data.text
      } else {
        const ts = new Date().toTimeString().slice(0, 5) // server arrival time
        s.utterances.set(data.id, {
          ts,
          speaker: data.speaker,
          text: data.text,
        })
      }
      s.updatedAt = new Date().toISOString()
      // ponytail: rewrite-whole on every POST; move to the analysis tick
      // (GMC-002) if per-caption sync writes ever show up as jank.
      fs.writeFileSync(path.join(s.dir, "transcript.txt"), render(s))
      res.writeHead(204, CORS).end()
    })
  }

  return http.createServer((req, res) => {
    if (req.url === "/" && req.method === "GET") {
      const items = [...sessions.values()]
        .map((s) => `<li><a href="/m/${s.id}">${escapeHtml(s.title)}</a></li>`)
        .join("")
      return res
        .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
        .end(
          `<!doctype html><meta charset=utf-8><title>meetings</title><ul>${items}</ul>`,
        )
    }
    const m = req.url.match(ROUTE)
    if (!m) return res.writeHead(404).end()
    const [, id, sub] = m
    if (sub === "/caption") return handleCaption(req, res, id)
    if (req.method !== "GET") return res.writeHead(404).end()
    if (sub === "/state") {
      const s = sessions.get(id)
      if (!s) return res.writeHead(404).end()
      return res.writeHead(200, { "Content-Type": "application/json" }).end(
        JSON.stringify({
          title: s.title,
          transcript: render(s),
          analysis: s.analysis,
          updatedAt: s.updatedAt,
        }),
      )
    }
    return res
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(SHELL)
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8737
  // 127.0.0.1 explicitly — the default bind would expose transcripts to the LAN.
  createApp().listen(port, "127.0.0.1", () => {
    console.log(`google-meet-companion on http://127.0.0.1:${port}/`)
  })
}
