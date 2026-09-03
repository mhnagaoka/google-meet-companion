import { spawn } from "node:child_process"
import fs from "node:fs"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

// Strict Meet-code parser: <id> is cross-origin input that becomes a
// filesystem path, so anything else 404s before touching disk or the Map.
const ROUTE = /^\/m\/([a-z]{3}-[a-z]{4}-[a-z]{3})(\/caption|\/state)?$/
const MEETING_DIR = /^\d{4}-\d{2}-\d{2}-[a-z]{3}-[a-z]{4}-[a-z]{3}$/
const MAX_BODY = 64 * 1024
const CORS = {
  "Access-Control-Allow-Origin": "https://meet.google.com",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// Prompt on stdin (never argv — ARG_MAX on long transcripts). See PRD 'Configuration'.
export const CLIS = {
  claude: {
    cmd: "claude",
    args: ["-p", "--model", "sonnet", "--effort", "low"],
  },
  opencode: { cmd: "opencode", args: ["run"] },
  "go-qwen": {
    url: "https://opencode.ai/zen/go/v1/chat/completions",
    model: "qwen3.8-flash",
    thinking: { type: "disabled" },
  },
}

const AUTH_PATH = path.join(os.homedir(), ".local/share/opencode/auth.json")

function loadApiKey() {
  if (process.env.OPENCODE_API_KEY) return process.env.OPENCODE_API_KEY
  try {
    const raw = fs.readFileSync(AUTH_PATH, "utf8")
    return JSON.parse(raw)?.["opencode-go"]?.key ?? ""
  } catch {
    return ""
  }
}

const PROMPT = `Você é um copiloto de reunião. Abaixo está a transcrição parcial de uma reunião
em andamento, gerada a partir das legendas automáticas do Google Meet (pode conter
erros de transcrição; ignore-os). Os rótulos de falante são os nomes reais dos
participantes; 'You' é o usuário local.

Responda em português, conciso, em tópicos:
1. **Tópicos discutidos** — com tempo aproximado gasto em cada um (use os timestamps)
2. **Alerta de tempo** — algum tópico está consumindo tempo demais?
3. **Contradições / pontas soltas** — afirmações conflitantes ou questões levantadas e não resolvidas
4. **Decisões e ações** — o que já foi decidido ou atribuído
5. **Perguntas sugeridas** — perguntas que 'You' poderia fazer para esclarecer pontas soltas, destravar decisões ou expor contradições. Carregue as perguntas ainda em aberto da análise anterior (que não foram respondidas nem perderam relevância) e some 2-3 novas conforme a transcrição avançou. Marque cada pergunta nova com '(nova)'
6. **Desde a última análise** — o que mudou: tópicos novos, pontas soltas resolvidas, alertas que deixaram de valer`

const PRIOR = `Sua análise anterior (use-a para manter nomes de tópicos consistentes, calcular
a seção 6 e carregar as perguntas ainda em aberto da seção 5 — re-derive o resto da transcrição):`

// Constant shell, identical bytes for every id.
const SHELL = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8")

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function createApp({
  dir = "meetings",
  llm = CLIS.claude,
  every = (Number(process.env.ANALYZE_EVERY) || 120) * 1000,
} = {}) {
  const sessions = new Map()

  function parseDirName(name) {
    if (!MEETING_DIR.test(name)) return null
    return { date: name.slice(0, 10), id: name.slice(11) }
  }

  function mtimeIso(p) {
    try {
      return fs.statSync(p).mtime.toISOString()
    } catch {
      return null
    }
  }

  function readTitle(sdir) {
    try {
      const first = fs
        .readFileSync(path.join(sdir, "transcript.txt"), "utf8")
        .split("\n")[0]
      // '# Title — id' -> 'Title'; fall back to the raw line if it doesn't match.
      const m = first.match(/^# (.+) — [a-z]{3}-[a-z]{4}-[a-z]{3}$/)
      return m ? m[1] : first || null
    } catch {
      return null
    }
  }

  function listDiskMeetings() {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return []
    }
    const meetings = []
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const parsed = parseDirName(e.name)
      if (!parsed) continue
      meetings.push({
        id: parsed.id,
        title: readTitle(path.join(dir, e.name)) || parsed.id,
        dir: path.join(dir, e.name),
      })
    }
    return meetings
  }

  function findDiskDir(id) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return null
    }
    let best = null
    let bestMtime = 0
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const parsed = parseDirName(e.name)
      if (!parsed || parsed.id !== id) continue
      const sdir = path.join(dir, e.name)
      const mt = fs.statSync(sdir).mtimeMs
      if (mt > bestMtime) {
        bestMtime = mt
        best = sdir
      }
    }
    return best
  }

  function loadDiskMeeting(id) {
    const sdir = findDiskDir(id)
    if (!sdir) return null
    const transcriptPath = path.join(sdir, "transcript.txt")
    const analysisPath = path.join(sdir, "analysis.txt")
    let transcript
    try {
      transcript = fs.readFileSync(transcriptPath, "utf8")
    } catch {
      return null
    }
    let analysis = ""
    try {
      analysis = fs.readFileSync(analysisPath, "utf8")
    } catch {}
    // ponytail: cross-midnight <date>-<id> dirs are not merged; we return the
    // most recently touched dir. A meeting that spans midnight keeps two dirs.
    return {
      title: readTitle(sdir) || id,
      transcript,
      analysis,
      updatedAt: mtimeIso(analysisPath) || mtimeIso(transcriptPath),
    }
  }

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
      let analysis = ""
      try {
        analysis = fs.readFileSync(path.join(sdir, "analysis.txt"), "utf8")
      } catch {}
      s = {
        id,
        title: title || id,
        dir: sdir,
        utterances: new Map(),
        prefix,
        analysis,
        updatedAt:
          mtimeIso(path.join(sdir, "analysis.txt")) ||
          mtimeIso(path.join(sdir, "transcript.txt")),
        dirty: false,
        inflight: false,
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

  async function handleCaption(req, res, id) {
    if (req.method === "OPTIONS") return res.writeHead(204, CORS).end()
    if (req.method !== "POST") return res.writeHead(404).end()
    let body = ""
    for await (const chunk of req) {
      body += chunk
      // returning mid-iteration destroys req, same as the old req.destroy()
      if (body.length > MAX_BODY) return res.writeHead(413, CORS).end()
    }
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
    // No disk write here: the analysis tick (and the shutdown flush) own
    // transcript.txt. dirty is the tick's only trigger — the write path
    // records the event, no size/content comparison.
    s.dirty = true
    res.writeHead(204, CORS).end()
  }

  function writeTranscript(s) {
    // A failed write only degrades persistence: memory (and /state) stay
    // ahead of disk by design, and the next tick retries.
    const text = render(s)
    try {
      fs.writeFileSync(path.join(s.dir, "transcript.txt"), text)
    } catch (err) {
      console.error(err)
    }
    return text
  }

  function applyAnalysis(s, out) {
    out = out.trim()
    if (!out) return // killed or empty: keep the last good analysis
    s.analysis = out
    s.updatedAt = new Date().toISOString()
    try {
      fs.writeFileSync(path.join(s.dir, "analysis.txt"), out)
    } catch (err) {
      console.error(err)
    }
  }

  async function analyze(s) {
    s.dirty = false
    s.inflight = true
    const transcript = writeTranscript(s)
    const prior = s.analysis ? `${PRIOR}\n${s.analysis}\n\n` : ""
    const prompt = `${PROMPT}\n\n${prior}Transcrição:\n${transcript}`

    if (llm.url) {
      const key = loadApiKey()
      if (!key) {
        s.inflight = false
        console.error(new Error(`Missing OPENCODE_API_KEY or ${AUTH_PATH}`))
        return
      }
      try {
        const res = await fetch(llm.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            // opencode session affinity: same meeting -> same upstream -> warm prompt cache
            "x-opencode-session": s.id,
          },
          body: JSON.stringify({
            model: llm.model,
            messages: [{ role: "user", content: prompt }],
            thinking: llm.thinking,
          }),
        })
        if (!res.ok) throw new Error(`zen HTTP ${res.status}`)
        const data = await res.json()
        applyAnalysis(s, data.choices?.[0]?.message?.content ?? "")
      } catch (err) {
        console.error(err)
      } finally {
        s.inflight = false
      }
      return
    }

    const child = spawn(llm.cmd, llm.args, {
      // Hang guard only (~5 min), not an interval-fitter: a wedged CLI can't
      // hold inflight forever, but a slow-working run is left alone.
      timeout: llm.timeout ?? 300_000,
      stdio: ["pipe", "pipe", "inherit"],
    })
    let out = ""
    child.stdout.on("data", (c) => {
      out += c
    })
    child.on("error", console.error) // spawn failure; 'close' still fires after it
    child.stdin.on("error", () => {}) // EPIPE when the CLI dies before reading
    child.on("close", (code) => {
      s.inflight = false
      if (code !== 0) return // killed: keep the last good analysis
      applyAnalysis(s, out)
    })
    child.stdin.end(prompt)
  }

  async function handle(req, res) {
    if (req.url === "/" && req.method === "GET") {
      const byId = new Map(listDiskMeetings().map((m) => [m.id, m]))
      for (const s of sessions.values()) byId.set(s.id, s)
      const items = [...byId.values()]
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
      if (s) {
        return res.writeHead(200, { "Content-Type": "application/json" }).end(
          JSON.stringify({
            title: s.title,
            transcript: render(s),
            analysis: s.analysis,
            updatedAt: s.updatedAt,
          }),
        )
      }
      // View-only load: read from disk without materializing a live session,
      // so the global analyze tick never fires for an ended meeting.
      const disk = loadDiskMeeting(id)
      if (!disk) return res.writeHead(404).end()
      return res
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify(disk))
    }
    return res
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(SHELL)
  }

  // One global timer looping the session Map — no per-session timers to leak.
  // The tick runs outside the request error boundary, so it catches its own
  // throws: a bad tick must not kill the server mid-meeting.
  const timer = setInterval(() => {
    for (const s of sessions.values()) {
      if (!s.dirty || s.inflight) continue
      try {
        analyze(s)
      } catch (err) {
        console.error(err)
        s.inflight = false
      }
    }
  }, every)
  timer.unref()

  // Sole error boundary for the request path: every route must run inside
  // handle() so sync throws and rejections become a logged 500 instead of an
  // uncaughtException killing the server mid-meeting. A second
  // http.createServer (the PRD's future share server) needs its own wrapper.
  const server = http.createServer((req, res) =>
    handle(req, res).catch((err) => {
      console.error(err)
      if (!res.headersSent) res.writeHead(500)
      res.end()
    }),
  )
  server.on("close", () => {
    clearInterval(timer)
    for (const s of sessions.values()) writeTranscript(s) // shutdown flush
  })
  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8737
  const server = createApp({ llm: CLIS[process.argv[2]] || CLIS.claude })
  // 127.0.0.1 explicitly — the default bind would expose transcripts to the LAN.
  server.listen(port, "127.0.0.1", () => {
    console.log(`google-meet-companion on http://127.0.0.1:${port}/`)
  })
  // 'close' flushes transcripts; closeAllConnections keeps pollers'
  // keep-alive sockets from stalling the close.
  for (const sig of ["SIGINT", "SIGTERM"])
    process.on(sig, () => {
      server.closeAllConnections()
      server.close(() => process.exit(0))
    })
}
