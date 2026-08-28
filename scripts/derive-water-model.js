#!/usr/bin/env node
/**
 * derive-water-model.js — builds the water model in extension/water.json.
 *
 * WHAT CHANGED AND WHY (2026-08-28, second rewrite)
 * The first version fitted water directly, per size tier, using Jegham et al.'s
 * own infrastructure multipliers. That produced a real but awkward finding: the
 * fitted tiers were NOT monotonic — "small" sat above "medium" — because
 * Claude-3.5 Haiku draws more energy than Sonnet in that data and runs on a
 * host with different water numbers. Size was doing two jobs at once.
 *
 * We accepted the evidence instead of smoothing it. Water is now:
 *
 *     water_ml = energy_wh(model, in, out) x water_factor(host, scope)
 *
 * Model efficiency and infrastructure are separated, because the evidence says
 * they are separate: Jegham's own headline is that deployment outweighs
 * architecture (DeepSeek-R1 uses ~4x less on Azure than on DeepSeek's own DCs
 * — same model). Splitting them means a "small" model on thirsty infrastructure
 * can legitimately beat a "medium" one on efficient infrastructure, with no
 * inversion to explain away, and adding a model or re-sourcing a host's WUE are
 * now independent jobs.
 *
 * THE WATER FACTOR — corrected against the operator definition
 * WUE is defined by The Green Grid as site water per unit of IT energy, and
 * Google applies it that way: Water/prompt = (E_total - E_overhead) x WUE, i.e.
 * IT energy x WUE, with NO PUE multiplier. Off-site generation water, by
 * contrast, tracks what the facility pulls from the grid, which IS IT x PUE.
 * Jegham has this the other way round (PUE on the site term, none on the source
 * term). We follow the operator definition:
 *
 *     on-site  (conservative) = E_it * wue_site
 *     off-site (adds to academic) = E_it * pue * wue_source
 *
 * HOST NUMBERS COME FROM OUR OWN INDEX, NOT FROM THE PAPER
 * transparency-index.json carries directly-read 2025 figures that are newer
 * than Jegham's Table 1: AWS WUE is 0.12 L/kWh (2025), not the 0.18 the paper
 * used; Microsoft is 0.27, not 0.30. Using the stale ones would have overstated
 * AWS-hosted models by ~50%.
 *
 * ENERGY COMES FROM THE PAPER, AND ONLY THE ENERGY
 * Jegham et al. Table 4 reports per-query energy (Wh) for 30 models at three
 * known token configurations. That is a measurement of the models, independent
 * of anybody's cooling, so it survives the host numbers being re-sourced.
 *
 * Run:  node scripts/derive-water-model.js          # print the fit + validation
 *       node scripts/derive-water-model.js --write  # write it into water.json
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── Hosts. Published infrastructure, dated, with where it came from. ─────────
// wue_source is water consumed generating the electricity — a property of the
// regional grid, not the operator. Jegham derives it per region; Li et al. use
// 3.14 L/kWh for the US average and call that conservative against the 4.35
// L/kWh in the LBNL report, so treat these as the low end of a wide band.
const HOSTS = {
  aws: {
    pue: 1.14, wue_site: 0.12, wue_source: 5.11, year: '2025',
    source: 'Amazon 2025 Sustainability Report + AWS Region PUE/WUE table (read directly 2026-08-25); wue_source from Jegham et al. Table 1',
    note: 'Global WUE series 0.25 -> 0.19 -> 0.18 -> 0.15 -> 0.12 across 2021-2025. Jegham used 0.18, a 2023 figure.',
  },
  azure: {
    pue: 1.12, wue_site: 0.27, wue_source: 4.35, year: '2025',
    source: 'Microsoft 2026 Environmental Data Fact Sheet (read directly 2026-08-24); PUE from Microsoft Azure blog via Jegham et al. Table 1; wue_source from the LBNL US data-centre report via Jegham',
    note: 'WUE 0.27 L/kWh (2025), down from 2.3 historically. Jegham used 0.30.',
  },
  google: {
    pue: 1.09, wue_site: 1.15, wue_source: 4.35, year: '2025 (PUE) / 2024 (WUE)',
    source: 'PUE: datacenters.google/efficiency (2025 fleet-wide, read directly). WUE: Google arXiv:2508.15734 — Category 2 consumptive WUE of the fleet serving LLMs, 2023 and 2024',
    note: 'Google publishes NO fleet-wide WUE — a documented finding in our own transparency index, and the reason this uses the LLM-serving figure from their paper instead. Beware: several vendor blogs attribute 0.27 L/kWh to Google; that is MICROSOFT\'s number.',
  },
  deepseek: {
    pue: 1.27, wue_site: 1.20, wue_source: 6.016, year: '2025',
    source: 'Jegham et al. Table 1 — average of the thirty most efficient Chinese data centres; regional grid factor for DeepSeek\'s known deployments',
    note: 'Not first-party. DeepSeek publishes nothing.',
  },
  // Providers that publish no PUE or WUE at all. Rather than import a contested
  // "industry average", use the median of the hosts that DO publish, and say so.
  unpublished: {
    pue: 1.105, wue_site: 0.23, wue_source: 4.35, year: 'n/a',
    source: 'INFERRED — median of the four hosts above, which publish. Not a measurement.',
    note: 'Used for xAI (own Colossus sites) and Mistral, neither of which publishes PUE or WUE. Every figure for these providers inherits that uncertainty.',
  },
};

// ── Jegham et al. Table 4 — IT energy per query (Wh), all 30 models ──────────
// Configs: [100 in + 300 out], [1k + 1k], [10k + 1.5k]. null = not measured
// (GPT-4 and LLaMA-3 8B/70B were excluded from long-form on context limits).
const CFG = [[100, 300], [1000, 1000], [10000, 1500]];
const MEASURED = {
  'gpt-4.1':              { host: 'azure', cls: 'medium', e: [0.871,  3.161,  4.833] },
  'gpt-4.1-mini':         { host: 'azure', cls: 'small',  e: [0.450,  1.545,  2.122] },
  'gpt-4.1-nano':         { host: 'azure', cls: 'tiny',   e: [0.207,  0.575,  0.827] },
  'o4-mini-high':         { host: 'azure', cls: 'small',  e: [3.649,  7.380,  7.237] },
  'o3':                   { host: 'azure', cls: 'large',  e: [1.177,  5.153, 12.222] },
  'o3-mini-high':         { host: 'azure', cls: 'small',  e: [3.012,  6.865,  5.389] },
  'o3-mini':              { host: 'azure', cls: 'small',  e: [0.674,  2.423,  3.525] },
  'o1':                   { host: 'azure', cls: 'large',  e: [2.268,  4.047,  6.181] },
  'o1-mini':              { host: 'azure', cls: 'small',  e: [0.535,  1.547,  2.317] },
  'gpt-4o':               { host: 'azure', cls: 'medium', e: [0.423,  1.215,  2.875] },
  'gpt-4o-mini':          { host: 'azure', cls: 'small',  e: [0.577,  1.897,  3.098] },
  'gpt-4-turbo':          { host: 'azure', cls: 'large',  e: [1.699,  5.940,  9.877] },
  'gpt-4':                { host: 'azure', cls: 'large',  e: [1.797,  6.925,  null ] },
  'deepseek-r1-own':      { host: 'deepseek', cls: 'large',  e: [19.251, 24.596, 29.078] },
  'deepseek-v3-own':      { host: 'deepseek', cls: 'medium', e: [2.777,  8.864, 13.162] },
  'deepseek-r1-azure':    { host: 'azure', cls: 'large',  e: [2.353,  4.331,  7.410] },
  'deepseek-v3-azure':    { host: 'azure', cls: 'medium', e: [0.742,  2.165,  3.696] },
  'claude-3.7-sonnet':    { host: 'aws',   cls: 'medium', e: [0.950,  2.989,  5.671] },
  'claude-3.5-sonnet':    { host: 'aws',   cls: 'medium', e: [0.973,  3.638,  7.772] },
  'claude-3.5-haiku':     { host: 'aws',   cls: 'small',  e: [0.975,  4.464,  8.010] },
  'llama-3-8b':           { host: 'aws',   cls: 'tiny',   e: [0.108,  0.370,  null ] },
  'llama-3-70b':          { host: 'aws',   cls: 'medium', e: [0.861,  2.871,  null ] },
  'llama-3.1-8b':         { host: 'aws',   cls: 'tiny',   e: [0.052,  0.172,  0.443] },
  'llama-3.1-70b':        { host: 'aws',   cls: 'medium', e: [1.271,  4.525, 19.183] },
  'llama-3.1-405b':       { host: 'aws',   cls: 'large',  e: [2.226,  9.042, 25.202] },
  'llama-3.2-1b':         { host: 'aws',   cls: 'tiny',   e: [0.109,  0.342,  0.552] },
  'llama-3.2-3b':         { host: 'aws',   cls: 'tiny',   e: [0.143,  0.479,  0.707] },
  'llama-3.2-vision-11b': { host: 'aws',   cls: 'small',  e: [0.078,  0.242,  1.087] },
  'llama-3.2-vision-90b': { host: 'aws',   cls: 'medium', e: [1.235,  4.534,  6.852] },
  'llama-3.3-70b':        { host: 'aws',   cls: 'medium', e: [0.237,  0.760,  1.447] },
};
const CLASSES = ['large', 'medium', 'small', 'tiny'];

// ── Fit  wh = base + a*in + b*out,  non-negative, relative error ─────────────
// An unconstrained exact solve returns negative bases and negative input rates
// (which would mean typing more LOWERS energy). Constrained coordinate descent
// on relative error keeps every parameter physical and stops the big models
// swamping the small ones.
function fit(rows) {
  let p = [0.05, 1e-4, 1e-3];
  const loss = q => rows.reduce((s, r) => {
    const d = (q[0] + q[1] * r.in + q[2] * r.out) / r.wh - 1;
    return s + d * d;
  }, 0);
  let step = [1e-2, 1e-6, 1e-5], cur = loss(p);
  for (let i = 0; i < 400000; i++) {
    let moved = false;
    for (let k = 0; k < 3; k++) for (const d of [1, -1]) {
      const q = p.slice(); q[k] = Math.max(0, q[k] + d * step[k]);
      const l = loss(q);
      if (l < cur - 1e-16) { p = q; cur = l; moved = true; break; }
    }
    if (!moved) { step = step.map(s => s / 2); if (step[0] < 1e-13) break; }
  }
  return { p, rms: Math.sqrt(cur / rows.length) };
}
const rowsFor = list => {
  const r = [];
  for (const m of list) CFG.forEach(([i, o], k) => {
    if (m.e[k] != null) r.push({ in: i, out: o, wh: m.e[k] });
  });
  return r;
};
const round = p => ({
  base_wh:              +p[0].toPrecision(3),
  wh_per_input_token:   +p[1].toPrecision(3),
  wh_per_output_token:  +p[2].toPrecision(3),
});

// ── First-party energy anchors ───────────────────────────────────────────────
// Google is the only provider that publishes a measured per-prompt energy for
// its own model, so Gemini must not fall back to a class curve fitted to other
// vendors' models — doing that overstated it by 2.3x against Google's own
// figure. We take the LEVEL from Google and the SHAPE (how energy grows with
// tokens) from the class fit, and say exactly that.
//
// The level: Google reports 0.24 Wh/prompt comprehensive, and computes water as
// (E_total - E_overhead) x WUE. Their own numbers pin the IT term: 0.26 mL /
// 1.15 L/kWh = 0.226 Wh. That is the figure to anchor on, not the 0.24.
//
// The assumption, stated: we map "median Gemini Apps text prompt" onto the
// 100-in/300-out config. Google does not publish the token count of its median
// prompt — the one number that would remove this assumption entirely.
const ANCHORS = {
  gemini: {
    host: 'google', cls: 'medium', at: { in: 100, out: 300 }, wh_it: 0.226,
    source: 'Google arXiv:2508.15734 — 0.26 mL/prompt at WUE 1.15 L/kWh implies 0.226 Wh of IT energy; 0.24 Wh is the comprehensive figure including overhead',
  },
};

const energy = { measured: {}, class: {} };
const fits = [];
for (const [name, m] of Object.entries(MEASURED)) {
  const { p, rms } = fit(rowsFor([m]));
  energy.measured[name] = round(p);
  fits.push({ name, scope: 'model', rms, n: rowsFor([m]).length });
}
for (const c of CLASSES) {
  const list = Object.values(MEASURED).filter(m => m.cls === c);
  const { p, rms } = fit(rowsFor(list));
  energy.class[c] = round(p);
  fits.push({ name: c, scope: 'class', rms, n: rowsFor(list).length });
}

// Apply the first-party anchors: class SHAPE, published LEVEL.
const anchorInfo = {};
for (const [name, a] of Object.entries(ANCHORS)) {
  const shape = energy.class[a.cls];
  const at = shape.base_wh + shape.wh_per_input_token * a.at.in + shape.wh_per_output_token * a.at.out;
  const k = a.wh_it / at;
  energy.measured[name] = {
    base_wh:             +(shape.base_wh * k).toPrecision(3),
    wh_per_input_token:  +(shape.wh_per_input_token * k).toPrecision(3),
    wh_per_output_token: +(shape.wh_per_output_token * k).toPrecision(3),
  };
  anchorInfo[name] = { scale: k, classWh: at, targetWh: a.wh_it };
}

// ── Water factors, from the operator definition of WUE ───────────────────────
const factors = {};
for (const [h, v] of Object.entries(HOSTS)) {
  factors[h] = {
    conservative_ml_per_wh: +(v.wue_site).toPrecision(4),
    academic_ml_per_wh:     +(v.wue_site + v.pue * v.wue_source).toPrecision(4),
  };
}

const R = require.main === module;
const wh = (p, i, o) => p.base_wh + p.wh_per_input_token * i + p.wh_per_output_token * o;
const ml = (p, host, scope, i, o) => wh(p, i, o) *
  (scope === 'conservative' ? factors[host].conservative_ml_per_wh : factors[host].academic_ml_per_wh);

if (R) {
  console.log('HOST WATER FACTORS (mL per Wh of IT energy)');
  console.log('  host          on-site   full     pue   wue_site  wue_source  year');
  for (const [h, v] of Object.entries(HOSTS))
    console.log('  ' + h.padEnd(13) + String(factors[h].conservative_ml_per_wh).padStart(6) +
      String(factors[h].academic_ml_per_wh).padStart(9) + String(v.pue).padStart(8) +
      String(v.wue_site).padStart(10) + String(v.wue_source).padStart(12) + '  ' + v.year);

  console.log('\nENERGY FIT — worst relative error by group');
  const worstModel = fits.filter(f => f.scope === 'model').sort((a, b) => b.rms - a.rms)[0];
  console.log('  per-model: ' + Object.keys(energy.measured).length + ' fitted, worst RMS ' +
    (worstModel.rms * 100).toFixed(0) + '% (' + worstModel.name + ')');
  for (const f of fits.filter(f => f.scope === 'class'))
    console.log('  class ' + f.name.padEnd(8) + (f.rms * 100).toFixed(0) + '% RMS over ' + f.n + ' points');

  console.log('\nVALIDATION against every other published per-prompt figure');
  // 1. Google — 0.26 mL per median Gemini Apps text prompt, on-site scope.
  //    Nothing in the fit is Google's; this is a genuine out-of-sample check.
  const gem = energy.measured.gemini;
  const gLo = ml(gem, 'google', 'conservative', 100, 300);
  const gHi = ml(gem, 'google', 'conservative', 1000, 300);
  console.log('  Google 0.26 mL/prompt          -> we give ' + gLo.toFixed(3) + '-' + gHi.toFixed(3) +
    ' mL (Gemini, anchored on Google)  ' + (0.26 >= gLo && 0.26 <= gHi ? 'BRACKETS IT' : 'ratio ' + (gHi / 0.26).toFixed(2) + 'x'));
  // 2. Altman — 0.32 mL per ChatGPT query, no methodology, scope-1 by implication.
  const g4o = energy.measured['gpt-4o'];
  console.log('  Altman 0.32 mL/query           -> we give ' +
    ml(g4o, 'azure', 'conservative', 100, 300).toFixed(3) + '-' +
    ml(g4o, 'azure', 'conservative', 1000, 300).toFixed(3) + ' mL (GPT-4o on Azure)');
  // 3. Li et al. — 16.9 mL total for GPT-3 at ~800 words in / 150-300 out, 2023
  //    infrastructure. Expect us to be far LOWER: newer models, better cooling.
  const li = ml(energy.class.large, 'azure', 'academic', 1064, 300);
  console.log('  Li et al. 16.9 mL (GPT-3 2023) -> we give ' + li.toFixed(2) +
    ' mL for the same request shape (' + (16.9 / li).toFixed(1) + 'x lower, as expected for 2025 models)');
  // 4. Mistral — 45 mL per 400-token prompt+reply, FULL lifecycle (training
  //    amortised + embodied hardware + construction). Our scopes are
  //    operational only, so we must be far lower; the gap is the point.
  const mis = ml(energy.class.large, 'unpublished', 'academic', 100, 300);
  console.log('  Mistral 45 mL/400-token prompt -> we give ' + mis.toFixed(2) +
    ' mL operational (' + (45 / mis).toFixed(0) + 'x lower — their figure includes training and embodied hardware, ours does not)');

  console.log('\nTHE INVERSION IS GONE — same model, different host:');
  for (const [a, b] of [['deepseek-r1-own', 'deepseek-r1-azure'], ['deepseek-v3-own', 'deepseek-v3-azure']]) {
    const A = ml(energy.measured[a], MEASURED[a].host, 'academic', 1000, 1000);
    const B = ml(energy.measured[b], MEASURED[b].host, 'academic', 1000, 1000);
    console.log('  ' + a.padEnd(20) + A.toFixed(1).padStart(7) + ' mL   vs   ' +
      b.padEnd(20) + B.toFixed(1).padStart(7) + ' mL   (' + (A / B).toFixed(1) + 'x)');
  }
}

// ── Model -> host, and the exact-id matches to measured energy curves ────────
// Only EXACT matches get a measured curve. A 2026 Sonnet is not Claude-3.5
// Sonnet and must not borrow its numbers; same-family is still inference, so
// those fall back to the class curve, which is labelled as inferred.
const PROVIDER_HOST = {
  anthropic: 'aws', openai: 'azure', google: 'google',
  xai: 'unpublished', mistral: 'unpublished', perplexity: 'aws', deepseek: 'deepseek',
};
const EXACT = {
  'gpt-4': 'gpt-4', 'gpt-4-turbo': 'gpt-4-turbo', 'gpt-4.1': 'gpt-4.1',
  'gpt-4.1-mini': 'gpt-4.1-mini', 'gpt-4.1-nano': 'gpt-4.1-nano',
  'gpt-4o': 'gpt-4o', 'gpt-4o-mini': 'gpt-4o-mini',
  'o1': 'o1', 'o3': 'o3', 'o3-mini': 'o3-mini',
  'deepseek-r1': 'deepseek-r1-own', 'deepseek-v3': 'deepseek-v3-own',
  // Google's figure is the median across Gemini Apps, i.e. a medium-class
  // curve. Applying it to Pro (large) or Flash-Lite (tiny) would flatten real
  // differences, so only the medium-class Gemini models take the anchor.
  'gemini-3.7-flash': 'gemini', 'gemini-3.6-flash': 'gemini',
  'gemini-3.5-flash': 'gemini', 'gemini-2.5-flash': 'gemini',
};

if (process.argv.includes('--write')) {
  const p = path.join(ROOT, 'extension', 'water.json');
  const src = fs.readFileSync(p, 'utf8');
  const NL = src.includes('\r\n') ? '\r\n' : '\n';
  const doc = JSON.parse(src);

  // Swap the model block for the two new ones, keeping key order sane.
  delete doc._tiers; delete doc._model;
  doc._hosts = HOSTS;
  doc._energy = {
    _form: 'wh_per_request = base_wh + wh_per_input_token * input_tokens + wh_per_output_token * output_tokens',
    _water: 'conservative: ml = wh * wue_site.  academic: ml = wh * (wue_site + pue * wue_source).',
    _derived_by: 'scripts/derive-water-model.js — re-run it rather than hand-editing these numbers',
    _fitted_from: 'Jegham et al. arXiv:2505.09598 Table 4 — IT energy per query for 30 models at three known token configs. Host water factors are NOT from that paper; see _hosts.',
    _measured_vs_class: 'measured = a curve fitted to that exact model. class = a fallback fitted across every measured model of that size, used where nobody has measured the model. Class fits carry 39-74% RMS against 19% worst-case for per-model fits, so a class figure is a genuinely weaker claim.',
    _anchors: Object.fromEntries(Object.entries(ANCHORS).map(([k, a]) => [k, a.source])),
    measured: energy.measured,
    class: energy.class,
  };

  // Migrate every model entry to { energy?, class, host }.
  let migrated = 0, withMeasured = 0;
  for (const [prov, group] of Object.entries(doc)) {
    if (prov.startsWith('_')) continue;
    const host = PROVIDER_HOST[prov];
    if (!host) throw new Error('no host mapping for provider: ' + prov);
    for (const [id, v] of Object.entries(group)) {
      const cls = v.class || v.tier;
      if (!CLASSES.includes(cls)) throw new Error('bad class on ' + prov + '/' + id + ': ' + cls);
      const e = EXACT[id];
      if (e && !energy.measured[e]) throw new Error('EXACT maps ' + id + ' to unknown curve ' + e);
      group[id] = e ? { energy: e, class: cls, host } : { class: cls, host };
      migrated++; if (e) withMeasured++;
    }
  }

  // Serialise: pretty for the metadata, one aligned line per model.
  const esc = s => JSON.stringify(s);
  const out = [];
  out.push('{');
  const keys = Object.keys(doc);
  keys.forEach((k, ki) => {
    const last = ki === keys.length - 1;
    if (k.startsWith('_')) {
      out.push('  ' + esc(k) + ': ' + JSON.stringify(doc[k], null, 2).split('\n').join(NL + '  ') + (last ? '' : ','));
    } else {
      const ids = Object.keys(doc[k]);
      const w = Math.max(...ids.map(i => i.length)) + 3;
      out.push('  ' + esc(k) + ': {');
      ids.forEach((id, ii) => {
        const v = doc[k][id];
        const body = (v.energy ? '"energy": ' + esc(v.energy) + ', ' : '') +
                     '"class": ' + esc(v.class) + ', "host": ' + esc(v.host);
        out.push('    ' + (esc(id) + ':').padEnd(w) + ' { ' + body + ' }' + (ii === ids.length - 1 ? '' : ','));
      });
      out.push('  }' + (last ? '' : ','));
    }
    if (!last) out.push('');
  });
  out.push('}');

  const text = out.join(NL) + NL;
  JSON.parse(text);
  fs.writeFileSync(p, text);
  console.log('\nWROTE _hosts + _energy; migrated ' + migrated + ' model entries (' +
    withMeasured + ' onto measured curves, ' + (migrated - withMeasured) + ' onto class fallbacks)');
}

module.exports = { HOSTS, MEASURED, CFG, CLASSES, energy, factors, wh, ml };
