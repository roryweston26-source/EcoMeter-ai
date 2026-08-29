#!/usr/bin/env node
/**
 * EcoMeter AI / Legerly — price data consistency check.
 *
 * A price lives in FIVE places and three of them drift silently. Before the
 * 2026-07-28 audit, pricing.html's FALLBACK_PRICES had Gemini 3.5 Flash right
 * while prices.json had it wrong (and Mistral Large 3 the other way round), so
 * the page showed different numbers depending on whether the live fetch
 * succeeded — and update-prices.js would have reverted the fix on its next run.
 *
 * Run this after ANY price change:  node scripts/check-prices.js
 * Exits non-zero on any inconsistency, so it can gate CI.
 */
const fs = require('fs');
const R = require('path').join(__dirname, '..') + '/';
const p = JSON.parse(fs.readFileSync(R + 'extension/prices.json', 'utf8'));
const w = JSON.parse(fs.readFileSync(R + 'extension/water.json', 'utf8'));
const L = JSON.parse(fs.readFileSync(R + 'plan-limits.json', 'utf8'));
const html = fs.readFileSync(R + 'pricing.html', 'utf8');
const js = fs.readFileSync(R + 'extension/sidepanel.js', 'utf8');
const up = fs.readFileSync(R + 'scripts/update-prices.js', 'utf8');

const all = {};
for (const [prov, m] of Object.entries(p.api)) for (const [k, v] of Object.entries(m)) all[k] = v;
let bad = 0;
const fail = s => { console.log('  X ' + s); bad++; };

// 1. price <-> water parity
for (const [prov, m] of Object.entries(p.api)) {
  const wp = w[prov] || {};
  for (const k of Object.keys(m)) if (!wp[k]) fail('priced, no water tier: ' + prov + '/' + k);
}

// 1b. water model shape. Water is energy x host, not a size tier: a curve in
// _energy (measured per model, or a class fallback) times the water rates of the
// _hosts entry the model runs on. Guard the joins as well as the numbers — a
// missing host or curve renders NO water figure at all, with no error, which is
// the same silent failure the tier-parity check above exists for.
const WCLASSES = ['large', 'medium', 'small', 'tiny'];
const WCURVE = ['base_wh', 'wh_per_input_token', 'wh_per_output_token'];
const WHOST = ['pue', 'wue_site', 'wue_source'];
const num = (v, what) => {
  if (typeof v !== 'number' || !isFinite(v) || v < 0) { fail(what + ' must be a finite number >= 0, got ' + v); return false; }
  return true;
};
if (w._tiers || w._model) fail('water.json still carries a pre-2026-08-28 _tiers/_model block — re-run scripts/derive-water-model.js --write');

if (!w._hosts) fail('water.json has no _hosts block');
else for (const [h, v] of Object.entries(w._hosts)) {
  for (const k of WHOST) num(v[k], '_hosts.' + h + '.' + k);
  if (!v.source) fail('_hosts.' + h + ' has no source — every published figure must say where it came from');
  // Full scope must exceed on-site, or the panel's toggle is a lie.
  if (!(v.wue_source > 0)) fail('_hosts.' + h + ': wue_source must be > 0 so the academic scope exceeds the conservative one');
}

if (!w._energy) fail('water.json has no _energy block');
else {
  for (const grp of ['measured', 'class']) {
    if (!w._energy[grp]) { fail('_energy.' + grp + ' missing'); continue; }
    for (const [name, c] of Object.entries(w._energy[grp]))
      for (const k of WCURVE) num(c[k], '_energy.' + grp + '.' + name + '.' + k);
  }
  for (const c of WCLASSES)
    if (!(w._energy.class || {})[c]) fail('_energy.class missing the ' + c + ' fallback');
  // A curve with no output cost would make every reply free.
  for (const [grp, set] of Object.entries({ measured: w._energy.measured || {}, class: w._energy.class || {} }))
    for (const [name, c] of Object.entries(set))
      if (!(c.wh_per_output_token > 0)) fail('_energy.' + grp + '.' + name + ': output tokens must cost energy');
}

// Every model must join to a real host and a real curve.
for (const [prov, group] of Object.entries(w)) {
  if (prov.startsWith('_')) continue;
  for (const [k, v] of Object.entries(group)) {
    if (!WCLASSES.includes(v.class)) fail('unknown water class "' + v.class + '" on ' + prov + '/' + k);
    if (!(w._hosts || {})[v.host]) fail('unknown water host "' + v.host + '" on ' + prov + '/' + k);
    if (v.energy && !((w._energy || {}).measured || {})[v.energy])
      fail('unknown measured energy curve "' + v.energy + '" on ' + prov + '/' + k);
  }
}

// 2. plan-limits joins + model refs
const subK = new Set(p.subscriptions.map(s => s.p + '|' + s.m));
for (const s of L.plans) {
  if (!subK.has(s.p + '|' + s.m)) fail('plan-limits orphan: ' + s.m);
  // A value_model may name another provider's model as "provider:model" — Perplexity's
  // plans are mostly frontier models from OpenAI, Anthropic, Google and xAI, so pricing
  // them against Perplexity's own Sonar rates answers the wrong question.
  if (s.value_models) for (const k of ['low', 'high']) {
    const raw = s.value_models[k];
    if (!raw) continue;
    const bits = String(raw).split(':');
    const prov = bits.length > 1 ? bits[0] : s.p, key = bits.length > 1 ? bits[1] : raw;
    if (!(p.api[prov] || {})[key]) fail('unresolved value_model: ' + s.m + ' -> ' + raw);
  }
}
for (const s of p.subscriptions)
  if (!L.plans.some(x => x.p === s.p && x.m === s.m)) fail('subscription with no plan-limits entry: ' + s.m);

// 3. displayed models are priced
const reg = html.slice(html.indexOf('var MODEL_REGISTRY'), html.indexOf('var PRICES_URL'));
const shown = [...reg.matchAll(/key:\s*"([^"]+)"/g)].map(m => m[1]);
for (const k of shown) if (!all[k]) fail('shown on page but unpriced: ' + k);

// 4. FALLBACK_PRICES matches prices.json, including long tiers
const fb = html.slice(html.indexOf('var FALLBACK_PRICES'), html.indexOf('function buildPerToken'));
const fbKeys = new Set();
for (const m of fb.matchAll(/"([\w.\-]+)":\s*\{ input:\s*([\d.e\-]+),\s*output:\s*([\d.e\-]+)([^}]*)\}/g)) {
  const [, k, i, o, rest] = m;
  fbKeys.add(k);
  const r = all[k];
  if (!r) { fail('fallback has unknown model: ' + k); continue; }
  if (Math.abs(parseFloat(i) - r.input) > 1e-12 || Math.abs(parseFloat(o) - r.output) > 1e-12)
    fail('fallback price drift: ' + k);
  const hasLong = /long:/.test(rest);
  if (!!r.long !== hasLong) fail('fallback long-tier mismatch: ' + k + (r.long ? ' (missing long)' : ' (unexpected long)'));
  if (r.long && hasLong) {
    const lm = rest.match(/over:\s*(\d+),\s*input:\s*([\d.e\-]+),\s*output:\s*([\d.e\-]+)/);
    if (!lm || +lm[1] !== r.long.over ||
        Math.abs(+lm[2] - r.long.input) > 1e-12 || Math.abs(+lm[3] - r.long.output) > 1e-12)
      fail('fallback long-rate drift: ' + k);
  }
}
for (const k of shown) if (!fbKeys.has(k)) fail('shown but absent from FALLBACK_PRICES: ' + k);

// 5. extension picker is priced
const cat = js.slice(js.indexOf('const MODEL_CATALOG'), js.indexOf('for (const grp of MODEL_CATALOG'));
for (const m of cat.matchAll(/key:'([^']+)'/g)) if (!all[m[1]]) fail('picker model unpriced: ' + m[1]);

// 6. update-prices.js would not revert anything
const chk = (k, i, o) => {
  const r = all[k];
  if (!r) return fail('updater knows unknown model: ' + k);
  if (Math.abs(i / 1e6 - r.input) > 1e-12 || Math.abs(o / 1e6 - r.output) > 1e-12)
    fail('UPDATER WOULD REVERT ' + k + ': $' + i + '/$' + o + ' vs $' + r.input * 1e6 + '/$' + r.output * 1e6);
};
for (const m of up.matchAll(/'([\w.\-]+)':\s*\{ input: perM\(([\d.]+)\),\s*output: perM\(([\d.]+)\)/g)) chk(m[1], +m[2], +m[3]);
for (const m of up.matchAll(/\['([\w.\-]+)',\s*([\d.]+),\s*([\d.]+)\]/g)) chk(m[1], +m[2], +m[3]);

// 7. Promotional rates must not outlive their expiry.
//
//    Sonnet 5 nearly taught this the expensive way: an introductory rate with a
//    published end date sat in `caveats` as prose, so nothing could check it, and
//    the only thing standing between us and a wrong price on 1 September was a
//    human remembering. Google then put two Flash models on a dated promo three
//    weeks later, so this is a recurring shape, not a one-off.
//
//    A promoted model carries { until, standard:{input,output} }. Past `until`,
//    this fails and tells you the number to write — no going back to the provider
//    to find out what the rate reverts to, which is how the data rots.
const today = new Date().toISOString().slice(0, 10);
let promos = 0;
for (const [prov, m] of Object.entries(p.api)) {
  for (const [k, v] of Object.entries(m)) {
    if (!v.promo) continue;
    promos++;
    const { until, standard } = v.promo;
    if (!until || !standard || standard.input == null || standard.output == null) {
      fail('promo block on ' + k + ' must carry { until, standard:{input,output} }');
      continue;
    }
    if (Math.abs(standard.input - v.input) < 1e-12 && Math.abs(standard.output - v.output) < 1e-12)
      fail('promo on ' + k + ' matches the standard rate — it is not a promotion');
    if (until < today)
      fail('PROMO EXPIRED ' + until + ': ' + k + ' must revert to $' +
           standard.input * 1e6 + '/$' + standard.output * 1e6 + ' per 1M (currently $' +
           v.input * 1e6 + '/$' + v.output * 1e6 + '), and the promo block removed');
  }
}

console.log(bad
  ? '\n' + bad + ' PROBLEM(S)'
  : '\nALL CHECKS PASS — ' + Object.keys(all).length + ' models priced, ' + promos +
    ' on promotional rates, ' + shown.length +
    ' shown, ' + Object.values(all).filter(x => x.long).length + ' with long-context tiers, ' + L.plans.length + ' plans');
process.exit(bad ? 1 : 0);
