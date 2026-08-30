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

// 8. Open weights and the host spread.
//
//    Both blocks were added 2026-08-29 with the three Chinese labs. They describe
//    a market rather than a rate card, so they rot faster than a price does: a
//    host list is a snapshot of who was serving a model on one day, and a licence
//    claim is a legal statement we are making on a provider's behalf. Neither is
//    checkable against the provider's own page the way `input`/`output` are, so
//    the guard is about shape and staleness, not correctness.
//
//    The staleness thresholds fail LOUD rather than silently ageing, on the same
//    principle as the promo check above.
const OSI = new Set(['apache-2.0', 'mit', 'modified-mit', 'bsd-3-clause']);
const STALE_DAYS = 120;
const daysOld = d => Math.floor((Date.now() - Date.parse(d)) / 86400000);
let ow = 0, spreads = 0;
for (const [prov, m] of Object.entries(p.api)) {
  for (const [k, v] of Object.entries(m)) {
    if (v.open_weights) {
      ow++;
      const o = v.open_weights;
      // A badge with no URL is an unverifiable claim — the whole point of the
      // block is that someone loaded the page the weights are on.
      if (!o.url || !/^https:\/\//.test(o.url)) fail('open_weights on ' + k + ' needs an https url to the weights');
      if (!o.license) fail('open_weights on ' + k + ' must name a licence (use the literal text if it is bespoke)');
      if (typeof o.osi !== 'boolean') fail('open_weights on ' + k + ' must set osi true/false');
      // osi:true is a stronger claim than "open" and drives a different badge.
      if (o.osi === true && !OSI.has(o.license))
        fail('open_weights on ' + k + ' claims osi:true for non-OSI licence "' + o.license + '"');
      if (o.osi === false && OSI.has(o.license))
        fail('open_weights on ' + k + ' sets osi:false for standard licence "' + o.license + '" — that understates it');
    }
    if (!v.hosted) continue;
    spreads++;
    const h = v.hosted;
    if (!v.open_weights) fail('hosted spread on ' + k + ' but no open_weights — only public weights can have a second host');
    for (const end of ['low', 'high']) {
      if (!h[end] || typeof h[end].input !== 'number' || typeof h[end].output !== 'number' || !h[end].host)
        return fail('hosted.' + end + ' on ' + k + ' needs { input, output, host }');
    }
    if (h.low.input > h.high.input) fail('hosted spread on ' + k + ': low.input exceeds high.input');
    if (typeof h.n !== 'number' || h.n < 2) fail('hosted on ' + k + ': n must be at least 2 — a single host is not a spread');
    if (h.cheaper_than_first_party != null && h.cheaper_than_first_party >= h.n)
      fail('hosted on ' + k + ': cheaper_than_first_party (' + h.cheaper_than_first_party + ') must be below n (' + h.n + ')');
    // The first-party rate is NOT required to sit inside the host range. The first
    // run of this check asserted it was and failed on qwen3.8-27b, where Alibaba's
    // $0.50 list price is above all eleven hosts — including Alibaba's own resale
    // at $0.425. That is the finding, not a bug. What is still worth catching is a
    // units error (a rate entered per-1M instead of per-token, or a decimal slip),
    // which shows up as an order-of-magnitude gap rather than a margin.
    const OOM = 3;
    if (v.input > h.high.input * OOM || v.input < h.low.input / OOM)
      fail('hosted on ' + k + ': first-party $' + (v.input * 1e6).toFixed(3) +
           ' is more than ' + OOM + 'x outside the observed host range $' + (h.low.input * 1e6).toFixed(3) +
           '-$' + (h.high.input * 1e6).toFixed(3) + ' — likely a units error in one of them');
    // quant_native suppresses the "precision varies" caveat on the page, which is a
    // claim about the lab's released checkpoint, not an observation about hosts. It
    // has to be evidenced or it is just a way of deleting an inconvenient warning.
    if (h.quant_native !== undefined) {
      if (h.quant_native !== true) fail('hosted on ' + k + ': quant_native must be true or absent');
      if (!h.quant_source || !/^https:\/\//.test(h.quant_source))
        fail('hosted on ' + k + ': quant_native needs a quant_source url proving the released precision');
    }
    if (!h.checked) fail('hosted on ' + k + ' must carry a "checked" date');
    else if (daysOld(h.checked) > STALE_DAYS)
      fail('HOST SPREAD STALE (' + daysOld(h.checked) + 'd): ' + k + ' last checked ' + h.checked +
           ' — re-read ' + (h.source || 'the endpoints listing') + ' or drop the block');
    if (!h.source) fail('hosted on ' + k + ' must cite where the spread was read');
  }
}

// 9. Stale superlatives — the ranking the Auditor's prose asserts.
//
//    audit.html tells the reader, in so many words, where DeepSeek sits on price.
//    That sentence said "still the cheapest provider we track" for six days after
//    the 2026-08-24 rise had already moved it to third. The new rates were recorded
//    correctly; nobody re-ran the ranking those rates invalidated.
//
//    A number in a data file gets checked. A superlative in a sentence does not,
//    unless something like this exists. This recomputes the ranking the copy claims
//    and fails with the real order when it moves, so the prose gets rewritten
//    instead of quietly rotting.
{
  const audit = fs.readFileSync(R + 'audit.html', 'utf8');
  const cheapest = {};
  for (const s of L.plans) {
    if (!s.value_models) continue;
    for (const which of ['low', 'high']) {
      const raw = s.value_models[which];
      if (!raw) continue;
      const bits = String(raw).split(':');
      const prov = bits.length > 1 ? bits[0] : s.p, key = bits.length > 1 ? bits[1] : raw;
      const r = (p.api[prov] || {})[key];
      if (!r) continue;
      // 3:1 input:output, the same shape the Auditor's own archetypes assume.
      const blended = (r.input * 3 + r.output) / 4 * 1e6;
      if (!cheapest[s.p] || blended < cheapest[s.p]) cheapest[s.p] = blended;
    }
  }
  // The copy is shown inside the Auditor, which prices only its OWN providers, so
  // it must be checked against that set — not against every provider on the site.
  // Conflating the two is what made the original sentence ambiguous enough to rot:
  // adding Z.ai on 2026-08-30 moved DeepSeek from 3rd to 4th site-wide while leaving
  // it 2nd of the four the Auditor can actually price. The copy now names its set
  // explicitly ("of the four providers this tool can price") and this follows suit.
  const AUDITOR = ['openai', 'anthropic', 'google', 'microsoft', 'deepseek'];
  const rankIn = set => {
    const o = Object.entries(cheapest).filter(([k]) => set.includes(k)).sort((a, b) => a[1] - b[1]);
    return { order: o.map(x => x[0]), fmt: o.map((x, i) => (i + 1) + '. ' + x[0] + ' $' + x[1].toFixed(3)).join('  ') };
  };
  const aud = rankIn(AUDITOR);
  const dsRank = aud.order.indexOf('deepseek') + 1;

  if (/cheapest provider we track/i.test(audit))
    fail('audit.html reuses the retired phrase "the cheapest provider we track". Auditor ranking: ' + aud.fmt);
  // The sentence states both a rank and a count; both must still hold.
  if (audit.includes('second cheapest rather than the first') && dsRank !== 2)
    fail('audit.html says DeepSeek is second cheapest of the Auditor set; it is now #' + dsRank +
         '. Rewrite that sentence. Auditor ranking: ' + aud.fmt);
  if (audit.includes('four providers this tool can price') && aud.order.length !== 4)
    fail('audit.html says "four providers this tool can price" but ' + aud.order.length +
         ' now have a priceable value_model: ' + aud.order.join(', '));
  // It also claims Z.ai and Mistral undercut DeepSeek from outside the tool.
  for (const outsider of ['zai', 'mistral'])
    if (cheapest[outsider] != null && cheapest.deepseek != null && cheapest[outsider] > cheapest.deepseek)
      fail('audit.html says ' + outsider + ' undercuts DeepSeek; it no longer does ($' +
           cheapest[outsider].toFixed(3) + ' vs $' + cheapest.deepseek.toFixed(3) + ')');
}

// 10. The allowance callout must not hardcode a count the data contradicts.
//
//     Same failure as §9, found the same day. pricing.html's callout computed
//     "2 have a usage cap the provider publishes" and then asserted, two clauses
//     later, that ChatGPT Go's was "the only absolute figure still published
//     anywhere" — a paragraph disagreeing with itself, because Perplexity Max was
//     added on 2026-08-29 and the prose was not. It understated what a provider
//     discloses, which is the direction this project treats as worst.
//
//     The sentence now enumerates the disclosed plans from plan-limits.json, so it
//     cannot drift. This guards the fix: no reintroduced superlative, and every
//     disclosed plan must carry a cap the callout can actually name.
{
  const disclosed = L.plans.filter(s => s.provenance === 'disclosed' || s.provenance === 'derived');
  // Strip comments first — the fix's own explanatory comment quotes the very
  // superlative it removed, and the first version of this check failed on it.
  // Only prose that can actually reach a reader counts.
  const rendered = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  if (/only absolute figure/i.test(rendered) && disclosed.length !== 1)
    fail('pricing.html calls an allowance "the only absolute figure" but ' + disclosed.length +
         ' plans are disclosed: ' + disclosed.map(s => s.m).join(', '));
  for (const s of disclosed) {
    const c = (s.caps || [])[0];
    if (!c) { fail('plan-limits: ' + s.m + ' is provenance "' + s.provenance + '" with no caps[] — the callout has nothing to name'); continue; }
    if (typeof c.n !== 'number' || !c.unit || !c.window)
      fail('plan-limits: ' + s.m + ' cap needs n / unit / window for the callout to render it');
  }
  // The callout must NAME the disclosed plans from the data, not from a sentence.
  // Testing for `provenance === "disclosed"` was too loose: that string also appears
  // in the tally a few lines above, so removing the naming logic left the guard
  // green. Anchor on the naming construct itself.
  if (!/var discPlans = plans/.test(html) || !/join\(partial\)/.test(html) || !/join\(whole\)/.test(html))
    fail('pricing.html callout no longer builds its list of disclosed plans from plan-limits — ' +
         'the sentence will go stale the next time a provider publishes an allowance');
  // It also splits feature-scoped caps from whole-plan ones and attributes the
  // whole-plan group to its provider(s). Both must stay derived: the first draft
  // hardcoded "every one of them from Z.ai", which is the same bug one layer down.
  if (!/scope_limited/.test(html))
    fail('pricing.html callout no longer distinguishes feature-scoped caps from whole-plan ones');
  if (/every one of them from Z\.ai/.test(html))
    fail('pricing.html callout hardcodes Z.ai as the sole whole-plan discloser — derive it from the data');
}

console.log(bad
  ? '\n' + bad + ' PROBLEM(S)'
  : '\nALL CHECKS PASS — ' + Object.keys(all).length + ' models priced, ' + promos +
    ' on promotional rates, ' + shown.length +
    ' shown, ' + Object.values(all).filter(x => x.long).length + ' with long-context tiers, ' +
    ow + ' with published weights (' + spreads + ' with a measured host spread), ' + L.plans.length + ' plans');
process.exit(bad ? 1 : 0);
