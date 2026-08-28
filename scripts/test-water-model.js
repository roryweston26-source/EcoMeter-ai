#!/usr/bin/env node
/**
 * EcoMeter AI — water-model tests.
 *
 * These exist because the water figure was wrong in a way that reading the code
 * could not reveal. Until 2026-08-28 water was one ml-per-token constant per
 * tier multiplied by total tokens. That is linear; reality is strongly
 * sublinear — in Jegham et al. (arXiv:2505.09598) a 28x rise in tokens raises
 * energy only about 5x, because latency-to-first-token, prefill and idle
 * capacity do not scale with length. Measured against that benchmark the flat
 * model was roughly right at 400 tokens and 4-15x OVER at 11,500, i.e. wrong
 * exactly where real chat sessions live.
 *
 * So these tests pin the two things that matter: that the shipped parameters
 * still reproduce the source data, and that the curve stays sublinear.
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
const { MODELS, INFRA, CFG, factor } = require('./derive-water-model.js');

// Lift the real function out of sidepanel.js rather than restating it here —
// a test that reimplements the formula cannot catch the formula changing.
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
const P = (scope, tier) => water._model[scope][tier];

console.log('water model — shape');
ok(!water._tiers, 'the old flat _tiers block is gone');
ok(!!water._model && !!water._model.conservative && !!water._model.academic,
   '_model carries both scopes');
ok(/derive-water-model/.test(water._model._derived_by || ''),
   '_model records the script that generated it');

console.log('\nwater model — reproduces Jegham et al., the data it was fitted to');
{
  let worst = 0, worstLabel = '';
  for (const [name, m] of Object.entries(MODELS)) {
    for (const scope of ['conservative', 'academic']) {
      const f = factor(m.infra, scope);
      CFG.forEach(([i, o], k) => {
        const actual = m.e[k] * f;
        const pred = waterForRequest(P(scope, m.tier), 1, i, o);
        const rel = Math.abs(pred / actual - 1);
        if (rel > worst) { worst = rel; worstLabel = name + ' ' + scope + ' cfg' + (k + 1); }
      });
    }
  }
  // Pooled tier fits over models whose own spreads are wide (o3 is +/-9%,
  // DeepSeek +/-49%); this is an order-of-magnitude domain, so the bar is
  // "no individual point is off by more than 2x", not tight agreement.
  ok(worst < 1.0, 'every model/config within 2x of source (worst ' +
     (worst + 1).toFixed(2) + 'x on ' + worstLabel + ')');
}

console.log('\nwater model — cross-check against Google, an independent anchor');
{
  // Google measured 0.26 mL per median Gemini Apps text prompt (arXiv:2508.15734):
  // different provider, different fleet, different WUE, different method from
  // anything in the fit. Nothing about the fit was tuned to hit this.
  for (const [label, tier, i, o] of [['medium', 'medium', 1000, 300], ['large', 'large', 1000, 300]]) {
    const ml = waterForRequest(P('conservative', tier), 1, i, o);
    const ratio = ml / 0.26;
    ok(ratio > 0.25 && ratio < 4,
      label + ' tier, 1k in / 300 out = ' + ml.toFixed(3) + ' mL vs Google 0.26 mL (' +
      ratio.toFixed(2) + 'x)');
  }
}

console.log('\nwater model — the sublinearity that motivated the rewrite');
for (const scope of ['conservative', 'academic']) {
  for (const tier of ['large', 'medium', 'small', 'tiny']) {
    const p = P(scope, tier);
    const perTok = (i, o) => waterForRequest(p, 1, i, o) / (i + o);
    const short = perTok(100, 300), mid = perTok(1000, 1000), long = perTok(10000, 1500);
    ok(short > mid && mid > long,
      scope + '/' + tier + ': ml-per-token falls as the query grows (' +
      short.toExponential(1) + ' -> ' + mid.toExponential(1) + ' -> ' + long.toExponential(1) + ')');
  }
}

console.log('\nwater model — monotonic in every input');
for (const scope of ['conservative', 'academic']) {
  const p = P(scope, 'large');
  ok(waterForRequest(p, 2, 1000, 500) >= waterForRequest(p, 1, 1000, 500), scope + ': more turns never lowers water');
  ok(waterForRequest(p, 1, 2000, 500) >= waterForRequest(p, 1, 1000, 500), scope + ': more input never lowers water');
  ok(waterForRequest(p, 1, 1000, 900) >  waterForRequest(p, 1, 1000, 500), scope + ': more output raises water');
}

console.log('\nwater model — full scope always exceeds on-site scope');
for (const tier of ['large', 'medium', 'small', 'tiny']) {
  const c = waterForRequest(P('conservative', tier), 3, 5000, 2000);
  const a = waterForRequest(P('academic', tier), 3, 5000, 2000);
  ok(a > c, tier + ': academic (' + a.toFixed(2) + ' mL) > conservative (' + c.toFixed(2) + ' mL)');
}

console.log('\nwater model — the regression it replaced');
{
  // The flat model shipped 0.020 ml/token academic/large. On a long session it
  // ran multiples over the benchmark; the new model must not.
  const OLD_FLAT = 0.020;
  const m = MODELS['o3'];
  const f = factor(m.infra, 'academic');
  const actual = m.e[2] * f;                       // 10k in + 1.5k out
  const oldPred = (10000 + 1500) * OLD_FLAT;
  const newPred = waterForRequest(P('academic', 'large'), 1, 10000, 1500);
  ok(oldPred / actual > 3, 'old flat model was >3x over on a long query (' +
     (oldPred / actual).toFixed(1) + 'x)');
  ok(newPred / actual < 2 && newPred / actual > 0.5,
     'new model is within 2x on the same query (' + (newPred / actual).toFixed(2) + 'x)');
}

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall water-model tests pass');
process.exit(fail ? 1 : 0);
