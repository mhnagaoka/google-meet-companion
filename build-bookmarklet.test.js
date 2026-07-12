import assert from "node:assert/strict"
import { test } from "node:test"
import { minify } from "./build-bookmarklet.js"

/* Minifier-safe like bookmarklet.src.js: no // line comments in code, no
   strings containing /*. The // inside the URL string must survive. */
const SRC = `/* a comment */
(() => {
  const URL = "http://localhost:8737";
  return URL;
})();`

test("minify emits a javascript: blob that parses as valid JS", () => {
  const blob = minify(SRC)
  assert.ok(blob.startsWith("javascript:"))
  const code = blob.slice("javascript:".length)
  assert.doesNotThrow(() => new Function(code)) // valid syntax
})

test("minify strips block comments but keeps // inside strings", () => {
  const blob = minify(SRC)
  assert.ok(!blob.includes("/*"), "block comment removed")
  assert.ok(blob.includes("http://localhost:8737"), "URL survives")
})
