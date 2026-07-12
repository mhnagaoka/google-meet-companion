/*
 * Google Meet Companion — caption capture bookmarklet (readable source).
 *
 * Click once per call, AFTER captions are on (CC / `c`). Watches the captions
 * region and POSTs each caption item (one speaker turn) as an upsert to the
 * local server; the server replaces by id, so a growing turn just re-POSTs a
 * longer text under the same id. See docs/PRD.md and dev/dom-behavior.md.
 *
 * Build note: build-bookmarklet.js strips these comments and collapses
 * whitespace, so keep this minifier-safe — explicit semicolons, braces on
 * every block, and no `//` line comments in code.
 */
(() => {
  /* --- config + DOM selectors (a Meet DOM change is a one-line edit here) --- */
  const SERVER = "http://localhost:8737";
  const COALESCE = 400;
  const REGIONS = [
    '[role="region"][aria-label*="caption" i]',
    '[role="region"][aria-label*="legenda" i]',
    '[jsname="dsyhDe"]',
  ];
  const ITEM = ".nMcdL.bj4p3b";
  const SPEAKER = ".NWpY1d";
  const TEXT = ".ygicle.VbkSUe";

  const region = REGIONS.map((s) => document.querySelector(s)).find(Boolean);
  if (!region) {
    console.warn(
      "[GMC] no captions region found — turn captions on (CC / c), then click again.",
    );
    return;
  }

  const code = location.pathname.slice(1);
  const title = document.title;
  const ids = new WeakMap();
  const lastText = new Map();
  let seq = 0;
  let timer = null;

  const flush = () => {
    timer = null;
    for (const el of region.querySelectorAll(ITEM)) {
      let id = ids.get(el);
      if (!id) {
        id = String(seq++);
        ids.set(el, id);
      }
      const speaker = el.querySelector(SPEAKER)?.textContent ?? "";
      const text = el.querySelector(TEXT)?.textContent ?? "";
      /* frozen items stop POSTing: text unchanged since last send -> skip */
      if (!text || lastText.get(id) === text) {
        continue;
      }
      lastText.set(id, text);
      fetch(SERVER + "/m/" + code + "/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, id, speaker, text }),
      }).catch(() => {});
    }
  };

  new MutationObserver(() => {
    if (!timer) {
      timer = setTimeout(flush, COALESCE);
    }
  }).observe(region, { childList: true, subtree: true, characterData: true });

  console.info("[GMC] capturing captions for", code);
})();
