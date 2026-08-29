#!/usr/bin/env node
/**
 * EcoMeter AI — water-model tests.
 *
 * Two rewrites happened on 2026-08-28 and both are pinned here.
 *
 *   1. Water used to be one ml-per-token constant per size tier, multiplied by
 *      total tokens. That is linear; reality is strongly sublinear — in Jegham
 *      et al. a 28x rise in tokens raises energy only ~5x. The flat model was
 *      roughly right at 400 tokens and 4-15x OVER at 11,500, i.e. wrong exactly
 *      where real chat sessions live.
 *
 *   2. Fitting water directly per size tier then produced a non-monotonic mess:
 *      "small" outranked "medium", because size was standing in for both model
 *      efficiency AND host infrastructure. Water is now energy x host, which is
 *      what the evidence actually supports — the same DeepSeek model uses ~7-10x
 *      less water on Azure than on DeepSeek's own data centres.
 *
 * Zero dependencies, consistent with the rest of the repo. Run:
 *   node scripts/test-water-model.js
 * Exits non-zero on failure so it can gate CI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const water = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension/water.json'), 'utf8'));
const src = fs.readFileSync(path.join(ROOT, 'extension/sidepanel.js'), 'utf8');
const { MEASURED, CFG, CLASSES, HOSTS } = require('./derive-water-model.js');

// Lift the real function rather than restating the formula — a test that
// reimplements it cannot catch the formula changing.
function lift(name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) throw new Error('not found in sidepanel.js: ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
}
const waterForRequest = eval('(' + lift('waterForRequest') + ')');

let fail = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + msg);
  if (!cond) fail++;
};

const curveOf = key => water._energy.measured[key] || water._energy.class[key];
const mlPerWh = (host, scope) => scope === 'academic'
  ? water._hosts[host].wue_site + water._hosts[host].pue * water._hosts[host].wue_source
  : water._hosts[host].wue_site;
const W = (key, host, scope, turns, i, o) =>
  waterForRequest({ curve: curveOf(key), mlPerWh: mlPerWh(host, scope) }, turns, i, o);
const whOf = (key, i, o) => {
  const c = curveOf(key);
  return c.base_wh + c.wh_per_input_token * i + c.wh_per_output_token * o;
};

console.log('shape');
ok(!water._tiers && !water._model, 'no pre-2026-08-28 _tiers/_model block');
ok(!!water._hosts && !!water._energy, '_hosts and _energy both present');
ok(CLASSES.every(c => water._energy.class[c]), 'all four class fallbacks present');
ok(Object.values(water._hosts).every(h => h.source), 'every host says where its figures came from');
{
  const models = Object.entries(water).filter(([k]) => !k.startsWith('_'))
    .flatMap(([, g]) => Object.values(g));
  ok(models.length === 68, models.length + ' models carry a water entry');
  ok(models.every(m => water._hosts[m.host]), 'every model joins to a real host');
  ok(models.every(m => !m.energy || water._energy.measured[m.energy]), 'every named energy curve exists');
  const measured = models.filter(m => m.energy).length;
  ok(measured > 0, measured + ' models on measured curves, ' + (models.length - measured) + ' on class fallbacks');
}

console.log('\nenergy curves reproduce Jegham et al. Table 4');
{
  let worst = 0, label = '';
  for (const [name, m] of Object.entries(MEASURED)) {
    if (!water._energy.measured[name]) continue;
    CFG.forEach(([i, o], k) => {
      if (m.e[k] == null) return;
      const rel = Math.abs(whOf(name, i, o) / m.e[k] - 1);
      if (rel > worst) { worst = rel; label = name + ' cfg' + (k + 1); }
    });
  }
  // Per-model fits, three points, three non-negative parameters. Tight.
  ok(worst < 0.45, 'worst per-model energy error ' + (worst * 100).toFixed(0) + '% (' + label + ')');
}

console.log('\nhost water rates match the published figures they cite');
for (const [h, v] of Object.entries(HOSTS)) {
  const j = water._hosts[h];
  ok(j && j.pue === v.pue && j.wue_site === v.wue_site && j.wue_source === v.wue_source,
    h + ': pue ' + v.pue + ', wue_site ' + v.wue_site + ', wue_source ' + v.wue_source);
}

console.log('\nvalidation against published per-prompt figures');
{
  // Google, 0.26 mL per median Gemini prompt, on-site. The Gemini curve is
  // anchored on Google's own energy, so this must bracket it.
  const lo = W('gemini', 'google', 'conservative', 1, 100, 300);
  const hi = W('gemini', 'google', 'conservative', 1, 1000, 300);
  ok(0.26 >= lo * 0.9 && 0.26 <= hi * 1.1,
    'Google 0.26 mL/prompt bracketed by ' + lo.toFixed(3) + '-' + hi.toFixed(3) + ' mL');

  // Li et al., 16.9 mL for GPT-3 in 2023 at ~800 words in / 150-300 out.
  // 2025 models on 2025 cooling must come out clearly lower.
  const li = W('large', 'azure', 'academic', 1, 1064, 300);
  ok(li < 16.9 && li > 16.9 / 8,
    'Li et al. 16.9 mL (2023) vs our ' + li.toFixed(2) + ' mL — lower, but not implausibly so');

  // Mistral, 45 mL per 400-token prompt, FULL lifecycle including training
  // amortisation and embodied hardware. Our scopes are operational only, so we
  // must be well below it. The gap is the finding, not a failure.
  const mis = W('large', 'unpublished', 'academic', 1, 100, 300);
  ok(mis < 45, 'Mistral 45 mL (full lifecycle) vs our ' + mis.toFixed(2) +
    ' mL operational — ' + (45 / mis).toFixed(0) + 'x gap is training + embodied hardware');
}

console.log('\nthe inversion is resolved: infrastructure, not size, explains the spread');
for (const [own, az] of [['deepseek-r1-own', 'deepseek-r1-azure'], ['deepseek-v3-own', 'deepseek-v3-azure']]) {
  const a = W(own, 'deepseek', 'academic', 1, 1000, 1000);
  const b = W(az, 'azure', 'academic', 1, 1000, 1000);
  ok(a > b * 3, own.replace('-own', '') + ': ' + a.toFixed(0) + ' mL on own DCs vs ' +
    b.toFixed(0) + ' mL on Azure (' + (a / b).toFixed(1) + 'x) — same model');
}

console.log('\nsublinearity — the reason the flat model was replaced');
for (const key of ['o3', 'gpt-4o', 'gemini', 'large', 'tiny']) {
  const pt = (i, o) => whOf(key, i, o) / (i + o);
  ok(pt(100, 300) > pt(1000, 1000) && pt(1000, 1000) > pt(10000, 1500),
    key + ': energy per token falls as the query grows');
}

console.log('\nmonotonic in every input, both scopes');
for (const scope of ['conservative', 'academic']) {
  ok(W('o3', 'azure', scope, 2, 1000, 500) >= W('o3', 'azure', scope, 1, 1000, 500), scope + ': more turns never lowers water');
  ok(W('o3', 'azure', scope, 1, 2000, 500) >= W('o3', 'azure', scope, 1, 1000, 500), scope + ': more input never lowers water');
  ok(W('o3', 'azure', scope, 1, 1000, 900) >  W('o3', 'azure', scope, 1, 1000, 500), scope + ': more output raises water');
}

console.log('\nfull scope always exceeds on-site scope');
for (const h of Object.keys(water._hosts)) {
  const c = W('large', h, 'conservative', 3, 5000, 2000);
  const a = W('large', h, 'academic', 3, 5000, 2000);
  ok(a > c, h + ': academic ' + a.toFixed(1) + ' mL > conservative ' + c.toFixed(1) + ' mL');
}

console.log('\nthe original regression stays fixed');
{
  // The very first flat model shipped 0.020 ml/token on the academic large tier.
  const flat = (10000 + 1500) * 0.020;
  const now = W('o3', 'azure', 'academic', 1, 10000, 1500);
  ok(flat / now > 2, 'flat model was ' + (flat / now).toFixed(1) + 'x the current figure on a long query');
}

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall water-model tests pass');
process.exit(fail ? 1 : 0);
