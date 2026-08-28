#!/usr/bin/env node
/**
 * derive-water-model.js — fits the query-size water model in extension/water.json.
 *
 * WHY THIS EXISTS
 * Until 2026-08-28 water was one ml-per-token constant per tier, multiplied by
 * total tokens. That is linear; reality is strongly sublinear. In Jegham et al.
 * (arXiv:2505.09598) a 28x rise in tokens (400 -> 11,500) raises energy only
 * about 5x, because latency-to-first-token, prefill and idle capacity do not
 * scale with length. A single constant can be right at one query size and
 * nowhere else — measured against Jegham the old model was roughly right at 400
 * tokens and 4-15x over at 11,500.
 *
 * THE MODEL
 *   water_ml_per_request = base + a * input_tokens + b * output_tokens
 *
 * Deliberately the same shape as the cost model in sidepanel.js: a per-request
 * fixed cost (cf. overheadPerTurn * turns), a cheap input rate (cf. billedInput
 * * inRate) and an expensive output rate (cf. adjustedOut * outRate). Decode is
 * sequential and memory-bandwidth-bound; prefill is parallel and cheap — which
 * is why b lands 1-2 orders of magnitude above a, and why long chats full of
 * replayed context grow slowly.
 *
 * THE DATA
 * Jegham et al. Table 4 gives per-query energy (Wh) for 30 models at three known
 * token configurations; Table 1 gives per-host PUE, on-site WUE and off-site
 * WUE. Their eq. 4 is
 *     Water(L) = E * PUE * WUE_site  +  E * WUE_source
 *                `-- on-site (our conservative) --'  `-- + off-site = our academic --'
 * which is exactly our conservative/academic split. With E in Wh the result is
 * in mL directly, so water_mL = E_Wh * factor.
 *
 * FITTING
 * An exact 3-point-per-model solve overfits: it returns negative bases and
 * negative input rates (unphysical — the panel would show water FALLING as you
 * type). Jegham's own spreads are wide (o3 12.222 +/- 1.082) and reasoning
 * models emit hidden tokens the visible-token parameterisation cannot see. So we
 * fit each TIER across all its models at once, constrained to non-negative
 * parameters, minimising RELATIVE error (values span orders of magnitude, so
 * absolute error would let the big models swamp the small ones).
 *
 * Run:  node scripts/derive-water-model.js          # print the fit
 *       node scripts/derive-water-model.js --write  # write it into water.json
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── Jegham et al. Table 1: per-host infrastructure multipliers ───────────────
const INFRA = {
  openai:    { host: 'Microsoft Azure', PUE: 1.12, wue_site: 0.30, wue_source: 4.35 },
  anthropic: { host: 'AWS',             PUE: 1.14, wue_site: 0.18, wue_source: 5.11 },
  meta:      { host: 'AWS',             PUE: 1.14, wue_site: 0.18, wue_source: 5.11 },
};
const factor = (i, scope) => scope === 'conservative'
  ? INFRA[i].PUE * INFRA[i].wue_site
  : INFRA[i].PUE * INFRA[i].wue_site + INFRA[i].wue_source;

// ── Jegham et al. Table 4: energy (Wh) at [100+300, 1k+1k, 10k+1.5k] ────────
const CFG = [[100, 300], [1000, 1000], [10000, 1500]];
const MODELS = {
  'o3':                { infra: 'openai',    tier: 'large',  e: [1.177, 5.153, 12.222] },
  'o1':                { infra: 'openai',    tier: 'large',  e: [2.268, 4.047,  6.181] },
  'GPT-4 Turbo':       { infra: 'openai',    tier: 'large',  e: [1.699, 5.940,  9.877] },
  'GPT-4.1':           { infra: 'openai',    tier: 'medium', e: [0.871, 3.161,  4.833] },
  'GPT-4o':            { infra: 'openai',    tier: 'medium', e: [0.423, 1.215,  2.875] },
  'Claude-3.7 Sonnet': { infra: 'anthropic', tier: 'medium', e: [0.950, 2.989,  5.671] },
  'Claude-3.5 Sonnet': { infra: 'anthropic', tier: 'medium', e: [0.973, 3.638,  7.772] },
  'Claude-3.5 Haiku':  { infra: 'anthropic', tier: 'small',  e: [0.975, 4.464,  8.010] },
  'o3-mini':           { infra: 'openai',    tier: 'small',  e: [0.674, 2.423,  3.525] },
  'GPT-4o mini':       { infra: 'openai',    tier: 'small',  e: [0.577, 1.897,  3.098] },
  'GPT-4.1 mini':      { infra: 'openai',    tier: 'small',  e: [0.450, 1.545,  2.122] },
  'GPT-4.1 nano':      { infra: 'openai',    tier: 'tiny',   e: [0.207, 0.575,  0.827] },
  'LLaMA-3.2 1B':      { infra: 'meta',      tier: 'tiny',   e: [0.109, 0.342,  0.552] },
  'LLaMA-3.2 3B':      { infra: 'meta',      tier: 'tiny',   e: [0.143, 0.479,  0.707] },
};
const TIERS = ['large', 'medium', 'small', 'tiny'];

// ── Non-negative fit, relative error, projected gradient descent ─────────────
function fitNonNegative(rows) { // rows: [{in, out, water}]
  let p = [0.01, 1e-5, 1e-3];           // base, a, b
  const loss = q => rows.reduce((s, r) => {
    const pred = q[0] + q[1] * r.in + q[2] * r.out;
    const rel = pred / r.water - 1;
    return s + rel * rel;
  }, 0);
  // scale-aware step sizes; the three parameters live on very different scales
  let step = [1e-3, 1e-7, 1e-5];
  let cur = loss(p);
  for (let iter = 0; iter < 200000; iter++) {
    let moved = false;
    for (let k = 0; k < 3; k++) {
      for (const dir of [1, -1]) {
        const q = p.slice();
        q[k] = Math.max(0, q[k] + dir * step[k]);
        const l = loss(q);
        if (l < cur - 1e-15) { p = q; cur = l; moved = true; break; }
      }
    }
    if (!moved) {
      step = step.map(s => s / 2);
      if (step[0] < 1e-12) break;
    }
  }
  return { params: p, rmsRelError: Math.sqrt(cur / rows.length) };
}

const out = { conservative: {}, academic: {} };
const report = [];

for (const scope of ['conservative', 'academic']) {
  for (const tier of TIERS) {
    const rows = [];
    for (const m of Object.values(MODELS)) {
      if (m.tier !== tier) continue;
      const f = factor(m.infra, scope);
      CFG.forEach(([i, o], k) => rows.push({ in: i, out: o, water: m.e[k] * f }));
    }
    const { params, rmsRelError } = fitNonNegative(rows);
    const [base, a, b] = params;
    out[scope][tier] = {
      base_ml_per_request: +base.toPrecision(3),
      ml_per_input_token:  +a.toPrecision(3),
      ml_per_output_token: +b.toPrecision(3),
    };
    report.push({ scope, tier, base, a, b, rms: rmsRelError, n: rows.length });
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const REPORT = require.main === module;
REPORT && console.log('Fitted from Jegham et al. (arXiv:2505.09598), ' +
            Object.keys(MODELS).length + ' models x 3 configs\n');
for (const scope of ['conservative', 'academic']) {
  REPORT && console.log(scope.toUpperCase() + '  (' +
    (scope === 'conservative' ? 'scope-1 on-site cooling' : 'scope 1+2 full lifecycle') + ')');
  REPORT && console.log('  tier     base mL/req   mL/in-tok    mL/out-tok   pts   RMS rel err');
  for (const r of report.filter(r => r.scope === scope)) {
    REPORT && console.log('  ' + r.tier.padEnd(9) +
      r.base.toFixed(4).padStart(9) + '  ' +
      r.a.toExponential(2).padStart(11) + '  ' +
      r.b.toExponential(2).padStart(11) + '  ' +
      String(r.n).padStart(4) + '  ' + (r.rms * 100).toFixed(0).padStart(8) + '%');
  }
  REPORT && console.log('');
}

// ── Cross-check against Google, an entirely independent anchor ──────────────
// Google measured 0.26 mL per median Gemini Apps text prompt (arXiv:2508.15734),
// on-site scope, on its own fleet — different provider, different WUE, different
// method from anything in the fit above.
const g = out.conservative.medium;
for (const [label, i, o] of [['short (100+300)', 100, 300], ['typical (1k+300)', 1000, 300]]) {
  const ml = g.base_ml_per_request + g.ml_per_input_token * i + g.ml_per_output_token * o;
  REPORT && console.log('CROSS-CHECK  medium tier, ' + label.padEnd(17) +
    '=> ' + ml.toFixed(3) + ' mL   (Google measured 0.26 mL/prompt)');
}

if (process.argv.includes('--write')) {
  // Surgical splice, not a re-serialise: water.json's per-model tier lists are
  // hand-aligned and JSON.stringify would flatten all 68 of them.
  const p = path.join(ROOT, 'extension', 'water.json');
  let src = fs.readFileSync(p, 'utf8');
  const NL = src.includes('\r\n') ? '\r\n' : '\n';

  const line = (t, o) => '      "' + t + '":' + ' '.repeat(8 - t.length) +
    '{ "base_ml_per_request": ' + o.base_ml_per_request +
    ', "ml_per_input_token": ' + o.ml_per_input_token +
    ', "ml_per_output_token": ' + o.ml_per_output_token + ' }';
  const scopeBlock = s => '    "' + s + '": {' + NL +
    TIERS.map(t => line(t, out[s][t])).join(',' + NL) + NL + '    }';

  const block = '  "_model": {' + NL +
    '    "_form": "water_ml_per_request = base_ml_per_request + ml_per_input_token * input_tokens + ml_per_output_token * output_tokens",' + NL +
    '    "_derived_by": "scripts/derive-water-model.js — re-run it rather than hand-editing these numbers",' + NL +
    scopeBlock('conservative') + ',' + NL + scopeBlock('academic') + NL +
    '  },';

  // Locate the old block by brace matching, not by line pattern: this file is
  // CRLF, and /^...$/m does NOT match before a \r, which silently anchors a
  // regex to the wrong line and swallows everything up to the next match.
  let start = -1;
  for (const key of ['"_tiers":', '"_model":']) {
    const k = src.indexOf(key);
    if (k !== -1) { start = k; break; }
  }
  if (start === -1) throw new Error('could not find the _tiers/_model block to replace');

  const open = src.indexOf('{', start);
  if (open === -1) throw new Error('no opening brace after the key');
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = k; break; } }
  }
  if (end === -1) throw new Error('unbalanced braces while scanning the block');

  // `block` carries its own leading indent and trailing comma; the old span runs
  // from the key to its closing brace, so drop the indent and take the comma too.
  const trailingComma = src[end + 1] === ',' ? 1 : 0;
  src = src.slice(0, start - 2) + block + src.slice(end + 1 + trailingComma);

  JSON.parse(src); // must still parse
  fs.writeFileSync(p, src);
  REPORT && console.log('\nWROTE _model into extension/water.json (tier lists untouched)');
}

module.exports = { out, MODELS, INFRA, CFG, factor };
