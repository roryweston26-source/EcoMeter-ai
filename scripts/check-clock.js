#!/usr/bin/env node
/**
 * Legerly — AI Clock consistency and plausibility check.
 *
 * The other guard scripts check FORM: that files parse, that copies agree, that
 * every displayed model has a price. None of them check whether a number is
 * POSSIBLE. On 2026-08-08 the clock's capex level implied a $978B calendar-2026
 * total against ~$725B actually guided by the four companies doing the spending —
 * 35% high, wrong for a full quarter, and passing validate-site.js cleanly the
 * entire time. The correct figure was sitting in the page's own prose next to it.
 *
 * This script closes that gap, in three parts:
 *
 *   1. FALLBACK PARITY — ai-clock.html carries a copy of SCENARIOS and RATES so a
 *      failed fetch degrades to the same numbers rather than to a silently stale
 *      year. A copy nothing checks is a copy that drifts.
 *   2. LEVEL PLAUSIBILITY — for the two counters where a single authoritative
 *      worldwide total exists (capex, energy), assert the three scenarios bracket
 *      the published figure within tolerance.
 *   3. SHARE SANITY — where no authoritative total exists, we can still assert
 *      that one company's own disclosure isn't an absurd fraction of our world
 *      total. That is what exposed the tokens level being ~2x too low.
 *
 * What this script deliberately does NOT do: invent targets for the counters
 * nobody publishes a total for. A made-up expected value would launder a guess
 * into a passing test, which is worse than no test at all. See
 * clock.json _meta.plausibility.comment.
 *
 * Run after any clock re-anchor:  node scripts/check-clock.js
 * Exits non-zero on any problem, so it can gate CI.
 */
const fs = require('fs');
const R = require('path').join(__dirname, '..') + '/';
const clock = JSON.parse(fs.readFileSync(R + 'clock.json', 'utf8'));
const html = fs.readFileSync(R + 'ai-clock.html', 'utf8');

let bad = 0;
const fail = s => { console.log('  X ' + s); bad++; };
const pct = (a, b) => Math.abs(a - b) / b * 100;

/* ── 1. Fallback parity ──────────────────────────────────────────────────────
   Anchored on the declaration that follows each block, so reordering them
   breaks this loudly rather than silently checking nothing. */
function block(start, end, name) {
  const i = html.indexOf(start), j = html.indexOf(end, i);
  if (i < 0 || j < 0) { fail('cannot locate ' + name + ' in ai-clock.html (anchors moved?)'); return null; }
  try { return new Function(html.slice(i, j) + '\nreturn ' + name + ';')(); }
  catch (e) { fail('cannot evaluate ' + name + ': ' + e.message); return null; }
}
const S = block('let SCENARIOS = {', 'let RATES', 'SCENARIOS');
const Rt = block('let RATES = {', 'function ', 'RATES');

if (S) for (const sc in clock.scenarios) {
  if (!S[sc]) { fail('fallback is missing scenario: ' + sc); continue; }
  for (const k in clock.scenarios[sc]) {
    const a = clock.scenarios[sc][k], b = S[sc][k];
    if (a !== b) fail('fallback drift scenarios.' + sc + '.' + k + ': clock.json=' + a + ' ai-clock.html=' + b);
  }
}
if (Rt) for (const k in clock.rates) {
  if (clock.rates[k] !== Rt[k])
    fail('fallback drift rates.' + k + ': clock.json=' + clock.rates[k] + ' ai-clock.html=' + Rt[k]);
}

/* ── 2. The anchor date must not be hardcoded in prose ───────────────────────
   It was, as "Jan 1, 2026", and stayed wrong for a whole quarter. The page
   renders it into #anchor-date from _meta.anchor; the only literal date allowed
   in that element is the pre-render fallback, which must match the real anchor. */
const anchorEl = html.match(/id="anchor-date"[^>]*>([^<]+)</);
if (!anchorEl) {
  fail('#anchor-date element not found — is the anchor being rendered from _meta.anchor?');
} else {
  const shown = new Date(anchorEl[1].trim() + ' UTC');
  const real = new Date(clock._meta.anchor + 'T00:00:00Z');
  if (isNaN(shown) || shown.getTime() !== real.getTime())
    fail('#anchor-date fallback text is "' + anchorEl[1].trim() + '" but _meta.anchor is ' +
         clock._meta.anchor + ' — update the literal so a pre-render flash is not a wrong date');
}

/* ── 3. Level plausibility ───────────────────────────────────────────────────*/
const P = (clock._meta || {}).plausibility;
if (!P) {
  fail('clock.json has no _meta.plausibility block — nothing to check levels against');
} else {
  for (const c of P.checks || []) {
    const vals = ['conservative', 'moderate', 'high']
      .map(s => (clock.scenarios[s] || {})[c.field])
      .filter(v => typeof v === 'number');
    if (vals.length !== 3) { fail('plausibility: ' + c.field + ' missing from one or more scenarios'); continue; }
    const lo = Math.min(...vals), hi = Math.max(...vals);

    // The published figure should sit inside the bracket the scenarios draw.
    if (c.published < lo || c.published > hi)
      fail('plausibility: ' + c.label + ' — published ' + c.published.toExponential(3) + ' ' + c.unit +
           ' is OUTSIDE the scenario range ' + lo.toExponential(3) + '–' + hi.toExponential(3) +
           '. Either re-anchor or the levels are wrong. Source: ' + c.source);

    // And the central case shouldn't be miles from it even if the range is wide.
    const mid = clock.scenarios.moderate[c.field];
    const d = pct(mid, c.published);
    if (d > c.tolerance_pct)
      fail('plausibility: ' + c.label + ' — moderate scenario is ' + d.toFixed(1) + '% from the published ' +
           c.published.toExponential(3) + ' ' + c.unit + ' (tolerance ' + c.tolerance_pct + '%). Source: ' + c.source);
  }

  /* ── 4. Share sanity ───────────────────────────────────────────────────────*/
  for (const c of P.share_checks || []) {
    for (const sc of ['conservative', 'moderate', 'high']) {
      const total = (clock.scenarios[sc] || {})[c.field];
      if (typeof total !== 'number') { fail('share check: ' + c.field + ' missing from ' + sc); continue; }
      const share = c.disclosed / total;
      if (share > c.max_share)
        fail('share check (' + sc + '): ' + c.label + ' — one company\'s disclosed ' +
             c.disclosed.toExponential(3) + ' is ' + (share * 100).toFixed(1) + '% of our world total ' +
             total.toExponential(3) + ', above the ' + (c.max_share * 100) + '% sanity bound. ' +
             'Our total is probably too low. Source: ' + c.source);
    }
  }
}

/* ── 5. Anchor staleness ─────────────────────────────────────────────────────
   Advisory, not a failure: the roller opens a PR quarterly and a human
   re-anchors. Past two quarters, that has stopped happening. */
const ageDays = Math.floor((Date.now() - new Date(clock._meta.anchor + 'T00:00:00Z')) / 864e5);
const stale = ageDays > 180;
if (stale) fail('anchor is ' + ageDays + ' days old — past two quarterly cycles. Re-anchor before trusting the page.');

console.log(bad
  ? '\n' + bad + ' PROBLEM(S)'
  : '\nCLOCK CHECKS PASS — anchor ' + clock._meta.anchor + ' (' + ageDays + ' days old), ' +
    'fallback in sync, ' + (P.checks || []).length + ' level checks + ' +
    (P.share_checks || []).length + ' share check plausible');
process.exit(bad ? 1 : 0);
