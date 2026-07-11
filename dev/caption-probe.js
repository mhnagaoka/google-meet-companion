// caption-probe.js — paste into the DevTools console on an active meet.google.com tab.
// Purpose: answer the two remaining open questions from the PRD (need a 2nd participant):
//   1. Concurrent speakers → does Meet render multiple caption items at once?
//   2. Does a turn spanning a debounce boundary split into overlapping lines?
//
// Usage:
//   1. Join a Meet call with at least one other person, turn captions on (press `c`).
//   2. Paste this whole file into the console.
//   3. Have people talk — ideally two at once, and one person pausing mid-turn then continuing.
//   4. Run  __probe.report()  to print findings, or  __probe.recs  for the raw timeline.

(() => {
  const SEL = [
    '[role="region"][aria-label*="caption" i]',
    '[role="region"][aria-label*="legenda" i]',   // pt
    '[role="region"][aria-label*="subtitle" i]',
    '[jsname="dsyhDe"]',
  ];
  const region = SEL.map(s => document.querySelector(s)).find(Boolean);
  if (!region) { console.warn('[probe] no captions region — enable captions (press c) then re-run'); return; }
  console.log('[probe] region matched:', region.getAttribute('aria-label') || region.getAttribute('jsname'));

  // Read the current caption items. Primary: obfuscated classes. Fallback: region children with an avatar img.
  function items() {
    let els = [...region.querySelectorAll('.nMcdL.bj4p3b')];
    if (!els.length) els = [...region.querySelectorAll(':scope > *')].filter(b => b.querySelector('img'));
    return els.map(el => {
      const byClass = el.querySelector('.NWpY1d');
      const speaker = (byClass?.textContent || el.innerText.split('\n')[0] || '').trim();
      const txtEl = el.querySelector('.ygicle.VbkSUe');
      const text = (txtEl?.textContent || el.innerText.split('\n').slice(1).join(' ') || '').trim();
      return { speaker, text };
    }).filter(x => x.text);
  }

  const P = (window.__probe = { recs: [], maxConcurrent: 0, t0: Date.now() });
  function snap(reason) {
    const its = items();
    if (its.length > P.maxConcurrent) P.maxConcurrent = its.length;
    P.recs.push({ dt: Date.now() - P.t0, reason, n: its.length, items: its.map(i => ({ s: i.speaker, t: i.text.slice(0, 60) })) });
    if (P.recs.length > 3000) P.recs.splice(0, 1000);
  }

  P.mo = new MutationObserver(() => snap('mut'));
  P.mo.observe(region, { childList: true, subtree: true, characterData: true });
  snap('init');

  P.report = () => {
    const multi = P.recs.filter(r => r.n > 1);
    console.log('=== caption-probe report ===');
    console.log('max concurrent items seen:', P.maxConcurrent, '(>1 confirms Meet renders one item per active speaker)');
    console.log('ticks with >1 speaker:', multi.length);
    if (multi.length) console.log('sample concurrent tick:', JSON.stringify(multi[Math.floor(multi.length / 2)], null, 2));
    // Per-speaker: watch for text that shrank then regrew (turn spanning a pause → possible split/overlap)
    const last = {}, shrinks = [];
    for (const r of P.recs) for (const it of r.items) {
      const prev = last[it.s];
      if (prev && !it.t.startsWith(prev.slice(0, Math.min(prev.length, 8))) && it.t.length < prev.length)
        shrinks.push({ dt: r.dt, speaker: it.s, from: prev.slice(0, 40), to: it.t.slice(0, 40) });
      last[it.s] = it.t;
    }
    console.log('text-shrink events (turn boundaries / potential overlap points):', shrinks.length);
    if (shrinks.length) console.log('samples:', JSON.stringify(shrinks.slice(0, 5), null, 2));
    console.log('raw timeline in __probe.recs (', P.recs.length, 'records )');
    return { maxConcurrent: P.maxConcurrent, multiSpeakerTicks: multi.length, shrinkEvents: shrinks.length };
  };

  console.log('[probe] recording. Talk (ideally 2 people at once + a mid-turn pause), then run  __probe.report()');
})();
