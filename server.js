import { spawn } from "node:child_process"
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

// Prompt on stdin (never argv — ARG_MAX on long transcripts). See PRD 'Configuration'.
export const CLIS = {
  claude: {
    cmd: "claude",
    args: ["-p", "--model", "sonnet", "--effort", "low"],
  },
  opencode: { cmd: "opencode", args: ["run"] },
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
5. **Perguntas sugeridas** — 2-3 perguntas que 'You' poderia fazer agora para esclarecer pontas soltas, destravar decisões ou expor contradições
6. **Desde a última análise** — o que mudou: tópicos novos, pontas soltas resolvidas, alertas que deixaram de valer`

const PRIOR = `Sua análise anterior (use-a só para manter nomes de tópicos consistentes e calcular
a seção 6 — re-derive todo o resto da transcrição):`

// Constant shell, identical bytes for every id (real page is GMC-003).
const SHELL =
  "<!doctype html><meta charset=utf-8><title>google-meet-companion</title><p>Meeting page coming soon."

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export function createApp({
  dir = "meetings",
  llm = CLIS.claude,
  every = (Number(process.env.ANALYZE_EVERY) || 120) * 1000,
} = {}) {
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

  function analyze(s) {
    s.dirty = false
    s.inflight = true
    const transcript = writeTranscript(s)
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
      out = out.trim()
      if (code !== 0 || !out) return // killed or empty: keep the last good analysis
      s.analysis = out
      s.updatedAt = new Date().toISOString()
      try {
        fs.writeFileSync(path.join(s.dir, "analysis.txt"), out)
      } catch (err) {
        console.error(err)
      }
    })
    const prior = s.analysis ? `${PRIOR}\n${s.analysis}\n\n` : ""
    child.stdin.end(`${PROMPT}\n\n${prior}Transcrição:\n${transcript}`)
  }

  async function handle(req, res) {
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
