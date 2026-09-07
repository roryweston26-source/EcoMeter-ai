#!/usr/bin/env node
/**
 * Legerly — tests for the UPPER-ENVELOPE five-hour estimator in measure-claude-limits.js.
 *
 * WHY THE ESTIMATOR CHANGED (2026-09-06). It used to take the MEAN of the 429 windows and
 * pick (alpha, beta) to minimise their spread — correct when errors are symmetric. They
 * are not. Usage on claude.ai, a phone or a second machine burns the same meter and is
 * invisible in these transcripts, so a window's visible units can only ever be too SMALL.
 * Every 429 is a LOWER BOUND on the cap, and a window far below the others is measuring
 * contamination rather than a smaller limit.
 *
 * The damage was not hypothetical. A seventh window arrived on 2026-09-05 at a fifth of
 * the usage of any other, and the mean-spread fit answered by dragging beta from 7.75 to
 * 21.5 and the cap from 3.09M to 5.05M — distorting the unit to accommodate a window that
 * was mostly spent somewhere else.
 *
 * WHAT REPLACED IT, in two stages, because one equation cannot fix two unknowns:
 *
 *   alpha — from the one-sided spread of the rejections. Every objective tried (mean
 *           shortfall, median shortfall, max/median) put it at 0 and held it there when
 *           the contaminated window was added.
 *   beta  — by RECONCILING TWO INDEPENDENT FAMILIES. A panel delta ("the bar moved 12
 *           points while we spent these tokens") implies a cap from data the rejection
 *           fit never sees. Both families are lower bounds, so if beta is right their
 *           highest members name the same cap. Beta is where they agree.
 *   cap   — the upper envelope, max_i units_i. Nothing is discarded; a contaminated
 *           window sits below it, and its distance below estimates what was spent
 *           off-machine.
 *
 * These tests build windows from a KNOWN cap and a KNOWN beta, hide known fractions of
 * them off-machine, and check the estimator recovers what it should — then check it
 * REFUSES to move when a badly contaminated window is added, which is the whole reason
 * the method changed. The superseded estimator is run alongside on the same data and is
 * required to fail that test, because a change nobody can demonstrate the need for is
 * not an improvement.
 *
 * Zero dependencies, consistent with the rest of the repo. Run:
 *   node scripts/test-limit-envelope.js
 * Exits non-zero on failure so it can gate CI.
 */
const M = require('./measure-claude-limits.js');

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fail++; };
const fmt = x => x == null ? '?' : (x / 1e6).toFixed(2) + 'M';
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// The truth the estimator is not told.
const TRUE_CAP = 3.5e6;
const TRUE_BETA = 8.0;

// A window that reached 100%: `hidden` is the fraction of the cap spent somewhere these
// transcripts cannot see, so only the rest is visible. `mix` is the share of the window's
// units coming from output — it must VARY across windows, or beta is not identifiable
// from them at all.
function windowAt(hidden, mix) {
  const visible = TRUE_CAP * (1 - hidden);
  const fromOutput = visible * mix;
  return {
    start: Date.UTC(2026, 7, 24) + Math.round(hidden * 1e7),
    unseenMin: 5,
    totals: {
      input: 0,
      cacheWrite: visible - fromOutput,          // weight 1
      cacheRead: 40e6 + mix * 60e6,              // weight alpha; large and variable
      output: fromOutput / TRUE_BETA,            // weight beta
      cost: 0, n: 100, unpriced: 0,
    },
  };
}

// A panel delta: the bar moved d5 points while this much was visibly spent. Same
// one-sided contamination, and a DIFFERENT output mix from the windows, which is what
// lets the reconciliation pin beta rather than merely agree with itself.
function deltaAt(d5, hidden, mix) {
  const visible = TRUE_CAP * (d5 / 100) * (1 - hidden);
  const fromOutput = visible * mix;
  return {
    from: '2026-09-02T16:00:00Z', to: '2026-09-02T16:30:00Z', d5: d5, n: 20,
    totals: {
      input: 0,
      cacheWrite: visible - fromOutput,
      cacheRead: 5e6 + mix * 8e6,
      output: fromOutput / TRUE_BETA,
      cost: 0, n: 20, unpriced: 0,
    },
  };
}

// One clean window and one clean delta, so the envelope is reachable from both families.
const CLEAN_WINDOWS = [
  windowAt(0.00, 0.55),
  windowAt(0.12, 0.35),
  windowAt(0.22, 0.70),
  windowAt(0.08, 0.45),
];
const CLEAN_DELTAS = [deltaAt(12, 0.00, 0.25), deltaAt(14, 0.15, 0.60)];

console.log('\nUPPER-ENVELOPE ESTIMATOR TESTS');
console.log('  true cap ' + fmt(TRUE_CAP) + ', true beta ' + TRUE_BETA + ', alpha 0');

// 1. Recover what we hid.
console.log('\n1. It recovers a cap and a beta it was not told');
const base = M.fitEnvelope(CLEAN_WINDOWS, CLEAN_DELTAS);
ok(base != null, 'the estimator returns a fit');
ok(base.alpha === 0, 'alpha comes back 0 — cache reads weigh nothing (got ' + base.alpha + ')');
ok(near(base.beta, TRUE_BETA, 0.2), 'beta ' + base.beta + ' recovers the true ' + TRUE_BETA);
ok(near(base.cap / TRUE_CAP, 1, 0.02), 'cap ' + fmt(base.cap) + ' recovers the true ' + fmt(TRUE_CAP));
ok(base.reconciliation && base.reconciliation.disagreement < 0.01,
  '  the two families agree to ' + (base.reconciliation.disagreement * 100).toFixed(2) + '%');

// 2. The shortfall is not residual noise — it is an estimate of off-machine usage.
console.log('\n2. Shortfall below the envelope estimates what was spent elsewhere');
const hid = [0.00, 0.12, 0.22, 0.08];
let worst = 0;
base.shortfalls.forEach((s, i) => { worst = Math.max(worst, Math.abs(s - hid[i])); });
ok(worst < 0.02, 'every window\'s shortfall matches the fraction hidden (worst error ' +
  (worst * 100).toFixed(1) + 'pp)');

// 3. THE POINT OF THE CHANGE. A badly contaminated window must not move the answer.
console.log('\n3. A badly contaminated window must not move the answer');
const withBad = CLEAN_WINDOWS.concat([windowAt(0.60, 0.50)]);
const after = M.fitEnvelope(withBad, CLEAN_DELTAS);
ok(after.beta === base.beta, 'beta is unchanged (' + base.beta + ' -> ' + after.beta + ')');
ok(after.cap === base.cap, 'the cap is unchanged (' + fmt(base.cap) + ' -> ' + fmt(after.cap) + ')');
ok(near(after.shortfalls[4], 0.60, 0.02),
  '  and the new window is reported at ' + (after.shortfalls[4] * 100).toFixed(0) +
  '% short, which is what it is');

// 4. The superseded estimator must FAIL that same test, or the change was unnecessary.
console.log('\n4. The superseded mean-spread estimator fails it, which is why it was replaced');
const oldBefore = M.fitByMeanSpread(CLEAN_WINDOWS);
const oldAfter = M.fitByMeanSpread(withBad);
ok(oldBefore.beta !== oldAfter.beta || Math.abs(oldAfter.cap / oldBefore.cap - 1) > 0.05,
  'minimising spread about the mean moves: beta ' + oldBefore.beta + ' -> ' + oldAfter.beta +
  ', cap ' + fmt(oldBefore.cap) + ' -> ' + fmt(oldAfter.cap));

// 5. The lower-bound property, which is the entire justification for taking a max —
//    AND the condition it depends on, which is the honest limit of the method.
console.log('\n5. The lower-bound property, and the condition it rests on');
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// 5a. Unconditional: at the true beta, contamination can only ever subtract.
let bad = 0;
for (let t = 0; t < 200; t++) {
  const ws = [];
  for (let i = 0; i < 5; i++) ws.push(windowAt(0.02 + rnd() * 0.6, 0.2 + rnd() * 0.6));
  if (Math.max(...ws.map(w => M.unitsOf(w.totals, 0, TRUE_BETA))) > TRUE_CAP * 1.000001) bad++;
}
ok(bad === 0, 'at the TRUE beta the envelope never exceeds the cap (200/200) — this is why max');

// 5b. The practical guarantee: one clean member in EACH family is enough.
let over = 0, trials = 0;
for (let t = 0; t < 200; t++) {
  const ws = [windowAt(0, 0.3 + rnd() * 0.4)];
  for (let i = 0; i < 4; i++) ws.push(windowAt(0.05 + rnd() * 0.5, 0.25 + rnd() * 0.5));
  const ds = [deltaAt(12, 0, 0.2 + rnd() * 0.5), deltaAt(14, 0.1 + rnd() * 0.3, 0.2 + rnd() * 0.5)];
  const f = M.fitEnvelope(ws, ds);
  if (!f) continue;
  trials++;
  if (f.cap > TRUE_CAP * 1.02) over++;
}
ok(trials > 100 && over === 0,
  'with one clean window AND one clean delta, the cap never exceeds the truth (' +
  (trials - over) + '/' + trials + ')');

// 5c. And the limit, asserted so nobody assumes the guarantee is unconditional. With
// NOTHING clean there is no anchor, beta drifts high, and the envelope inflates with it.
// This is the state this account is actually in, which is why the report says so.
let over2 = 0, trials2 = 0, worstOvershoot = 1, covered = 0;
for (let t = 0; t < 200; t++) {
  const ws = [];
  for (let i = 0; i < 5; i++) ws.push(windowAt(0.05 + rnd() * 0.5, 0.25 + rnd() * 0.5));
  const ds = [deltaAt(12, 0.05 + rnd() * 0.4, 0.2 + rnd() * 0.5)];
  const f = M.fitEnvelope(ws, ds);
  if (!f) continue;
  trials2++;
  worstOvershoot = Math.max(worstOvershoot, f.cap / TRUE_CAP);
  if (f.cap > TRUE_CAP * 1.02) over2++;
  if (f.capRange && f.capRange[0] <= TRUE_CAP && f.capRange[1] >= TRUE_CAP) covered++;
}
ok(over2 > 0,
  'with NOTHING clean the guarantee FAILS — ' + over2 + '/' + trials2 +
  ' overshot, worst by ' + ((worstOvershoot - 1) * 100).toFixed(0) + '%');
ok(covered < trials2 * 0.5,
  '  and capRange does not rescue it (' + covered + '/' + trials2 +
  ' covered the truth), so the ">=" must be quoted as conditional');

// 6. Cache reads at their billing weight must be visibly worse, or alpha=0 says nothing.
console.log('\n6. alpha = 0 is a finding, so a billing-weight cache read must be worse');
ok(base.disagreementAtBillingCacheRead != null &&
   base.disagreementAtBillingCacheRead > 0.05,
  'at alpha = 0.1 the two families disagree by ' +
  (base.disagreementAtBillingCacheRead * 100).toFixed(0) + '%, against ' +
  (base.reconciliation.disagreement * 100).toFixed(2) + '% at alpha = 0');

// 7. Why alpha is imposed rather than fitted: the reconciliation criterion is nearly
//    FLAT in alpha, so it cannot identify it. A positive alpha buys almost the same
//    agreement at a quite different beta, and on the real rejections the branch at
//    alpha 0.02 / beta 36 agrees exactly. Agreement alone therefore proves nothing
//    about alpha, and an estimator that fitted it would wander.
console.log('\n7. The reconciliation cannot identify alpha, which is why alpha is imposed');
let rival = null;
for (let a = 0.01; a <= 1.0001; a += 0.01) {
  const r = M.reconcileBeta(CLEAN_WINDOWS, CLEAN_DELTAS, +a.toFixed(2));
  if (r && (!rival || r.disagreement < rival.d)) rival = { a: +a.toFixed(2), b: r.beta, d: r.disagreement };
}
ok(rival !== null && rival.d < 0.01,
  'a positive alpha reaches ' + (rival.d * 100).toFixed(3) + '% disagreement (alpha ' +
  rival.a + ', beta ' + rival.b + ') — nearly as good, at a different beta');
ok(Math.abs(rival.b - TRUE_BETA) > 1,
  '  and it gets there with the WRONG beta (' + rival.b + ' vs ' + TRUE_BETA + ')');
ok(base.alpha === 0 && base.alphaImposed,
  '  so the fit imposes alpha = 0 rather than searching for it');

// 8. Without panel deltas beta is weakly identified, and the fit must SAY so rather
//    than quietly hand back a number that looks as good as a reconciled one.
console.log('\n8. With no panel deltas it declares beta weakly identified');
const noDeltas = M.fitEnvelope(CLEAN_WINDOWS, []);
ok(noDeltas != null && noDeltas.reconciliation === null, 'no reconciliation is reported');
ok(/weakly identified/.test(noDeltas.betaFrom),
  'and betaFrom says so: "' + noDeltas.betaFrom + '"');
ok(noDeltas.cap <= TRUE_CAP * 1.02,
  '  the cap is still a lower bound (' + fmt(noDeltas.cap) + ')');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall upper-envelope tests pass');
process.exit(fail ? 1 : 0);
