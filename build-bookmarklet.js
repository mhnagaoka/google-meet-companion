// Minifies bookmarklet.src.js to the single-line `javascript:` blob you paste
// into a bookmark. ponytail: this only strips /* */ comments + collapses
// whitespace, which is safe because the source is authored minifier-safe (no //
// line comments in code, no strings containing /*). Reach for a real minifier
// (terser) only if the source ever needs constructs this can't handle.
import fs from "node:fs"

const SRC = "bookmarklet.src.js"
const OUT = "bookmarklet.min.js"

export function minify(src) {
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, "") // drop block comments
    .replace(/\s+/g, " ") // collapse whitespace (no meaningful runs in source)
    .trim()
  return "javascript:" + code
}

// Run as a script (not when imported by the test).
if (import.meta.url === `file://${process.argv[1]}`) {
  const blob = minify(fs.readFileSync(SRC, "utf8"))
  fs.writeFileSync(OUT, blob + "\n")
  console.log(`Wrote ${OUT} (${blob.length} bytes)`)
}
