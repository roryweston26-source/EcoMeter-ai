#!/usr/bin/env node
/**
 * Legerly — tests for the tick-bracket estimator in measure-claude-limits.js.
 *
 * WHY THIS EXISTS. The weekly cap cannot be read off a 429 the way the five-hour one
 * was, because no weekly rejection has ever landed on this account. It has to come
 * from the percentage bar, and a bar rounded to whole points is a blunt instrument:
 * a pair of LEVEL readings carries +/-1 point at both ends, so a one-point move
 * cannot beat about +/-50% however exact the token side is.
 *
 * Ticks beat that. Between the instant the bar turns v-1 -> v and the instant it turns
 * v -> v+1, exactly one point of the cap is spent. We never see either instant, only
 * that the bar read v at one glance and v+1 at the next, so the estimator brackets the
 * answer instead of pretending to a point value:
 *
 *   capLo = 100 * units(first sighting of v  -> last sighting of v)    <= cap
 *   capHi = 100 * units(last sighting of v-1 -> first sighting of v+1) >= cap
 *
 * An estimator whose whole claim is "the true cap lies inside this bracket" is worth
 * nothing until it has been run against a cap that is already known. So these tests
 * SIMULATE a meter of known size over the real transcript token stream and check the
 * bracket contains it — then break the assumptions one at a time and check it stops
 * containing it, because an estimator that survives its own violations is not
 * measuring anything.
 *
 * Zero dependencies, consistent with the rest of the repo. Run:
 *   node scripts/test-limit-ticks.js
 * Exits non-zero on failure so it can gate CI.
 */
const path = require('path');
const os = require('os');
const M = require('./measure-claude-limits.js');

const argVal = f => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const projectsDir = argVal('--projects') || path.join(os.homedir(), '.claude', 'projects');

let fail = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fail++; };
const fmt = x => x == null ? '?' : (x / 1e6).toFixed(2) + 'M';

// The fitted unit from the 429s. Fixed rather than re-fitted, so a failure here means
// the estimator moved and not that somebody's usage did.
const MODEL = { alpha: 0, beta: 7.75, cap: 3.09e6 };
const units = rs => M.unitsOf(M.totalsOf(rs), MODEL.alpha, MODEL.beta);

// ---------------------------------------------------------------- the token stream
// Prefer the real transcripts: real work is bursty in a way no generator imitates, and
// the estimator has to survive that. But the transcripts only exist on Rory's machine,
// and a test that can only run there is a test that rots. So CI gets a deterministic
// synthetic stream instead — same shape, fixed seed, no dependence on anyone's usage.
function syntheticStream() {
  let seed = 0x9e3779b9;                                   // fixed, so CI never flakes
  const rnd = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [];
  let t = Date.parse('2026-08-24T09:00:00Z');
  let ctx = 20000;
  for (let i = 0; i < 3000; i++) {
    // Bursts of fast tool calls separated by pauses, which is what the real stream does
    // and what makes glance cadence matter at all.
    t += rnd() < 0.9 ? 8000 + rnd() * 40000 : 900000 + rnd() * 5400000;
    ctx = rnd() < 0.04 ? 20000 : Math.min(180000, ctx + 1500 + rnd() * 6000);
    out.push({
      ts: new Date(t).toISOString(),
      model: 'claude-opus-5', session: 'synthetic',
      input: Math.round(4 + rnd() * 60),
      output: Math.round(120 + rnd() * 2600),
      cacheWrite: Math.round(1500 + rnd() * 14000),
      write5m: 0, write1h: 0,
      cacheRead: Math.round(ctx * (0.7 + rnd() * 0.6)),
    });
  }
  return out;
}

const real = M.load(projectsDir).requests
  .filter(r => r.ts >= '2026-08-24' && r.ts < '2026-09-01');
const usingReal = real.length >= 200;
const requests = usingReal ? real : syntheticStream();

// ---------------------------------------------------------------- the simulator
// Take a real run of requests, declare a cap, and render the bar the way the panel
// would. `round` is a free parameter on purpose: the estimator must not care whether
// the product floors or rounds, and one of the tests below proves it does not.
function simulate(rs, cap, opts) {
  const cadenceMin = opts.cadenceMin;
  const round = opts.round || Math.floor;
  const hide = opts.hide || (() => false);
  const resetAt = opts.resetAt || null;
  const t0 = Date.parse(rs[0].ts) - 60000;
  const t1 = Date.parse(rs[rs.length - 1].ts) + 60000;
  const readings = [];
  for (let t = t0; t <= t1; t += cadenceMin * 60000) {
    // What the METER has counted: everything, including usage this machine cannot see.
    // A reset does not clamp the bar, it re-bases it — the window starts again from
    // zero and gets a new reset instant. Simulating it any other way invents a meter
    // that stalls while usage flows, which is not a thing a healthy bar does.
    const from = resetAt && t >= resetAt ? resetAt : t0;
    const spent = units(rs.filter(r => {
      const rt = Date.parse(r.ts);
      return rt > from && rt <= t;
    }));
    readings.push({
      ts: new Date(t).toISOString(),
      weeklyPct: Math.max(0, Math.min(100, round(100 * spent / cap))),
      weeklyReset: resetAt && t >= resetAt ? '2026-01-08T00:00:00Z' : '2026-01-01T00:00:00Z',
    });
  }
  // What the ESTIMATOR gets to see. `hide` is how off-machine usage is injected: the
  // meter counted it, the transcripts on this machine do not contain it.
  return { readings: readings, visible: rs.filter(r => !hide(r)) };
}

function run(rs, cap, opts) {
  const sim = simulate(rs, cap, opts);
  const brackets = M.tickBrackets(sim.readings, sim.visible, MODEL, M.METERS.weekly);
  return { brackets: brackets, isect: M.intersectBrackets(brackets), readings: sim.readings };
}

const contains = (b, cap) =>
  (!b.capLo || b.capLo <= cap) && (b.capHi == null || b.capHi >= cap);

// Simulate the weekly cap we actually believe in — ~10.2 five-hour caps, per
// MEASURE-CLAUDE-LIMITS.md — rather than an arbitrary number, so the exercise mirrors
// the real measurement and the 33.6x ceiling below means something. Then take the
// prefix of the stream that spends ~42 points of it: far enough for the bar to move a
// long way, not so far that it saturates at 100 and stops being a meter.
const TRUE_CAP = 10.2 * MODEL.cap;
const busy = (() => {
  const out = [];
  let spent = 0;
  for (const r of requests) {
    spent += units([r]);
    out.push(r);
    if (spent >= 0.42 * TRUE_CAP) break;
  }
  return out;
})();

console.log('\nTICK-BRACKET TESTS');
console.log('  ' + busy.length + ' ' + (usingReal ? 'real' : 'synthetic') + ' requests, ' +
  fmt(units(busy)) + ' units, simulating a ' + fmt(TRUE_CAP) + ' cap');
if (!usingReal) {
  console.log('  (no transcripts under ' + projectsDir + ' - running on the seeded stream)');
}

// 1. The core claim: the bracket contains a truth we already know.
console.log('\n1. The bracket contains a cap we already know');
[30, 10, 3].forEach(function (cadenceMin) {
  const r = run(busy, TRUE_CAP, { cadenceMin: cadenceMin });
  ok(r.brackets.length > 0,
    'a ' + cadenceMin + '-minute glance produces brackets (' + r.brackets.length + ')');
  ok(r.brackets.every(b => contains(b, TRUE_CAP)), '  every one of them contains the true cap');
  ok(r.isect && !r.isect.contradiction && r.isect.lo <= TRUE_CAP && r.isect.hi >= TRUE_CAP,
    '  so does their intersection: ' + fmt(r.isect && r.isect.lo) + ' - ' + fmt(r.isect && r.isect.hi));
});

// 2. Glancing more often is the entire point, so it had better pay.
console.log('\n2. Glancing more often narrows the bracket');
const widths = [30, 10, 3].map(function (cadenceMin) {
  const isect = run(busy, TRUE_CAP, { cadenceMin: cadenceMin }).isect;
  return isect && isect.lo ? isect.hi / isect.lo : Infinity;
});
ok(widths[0] >= widths[1] && widths[1] >= widths[2],
  'width falls with cadence: ' + widths.map(w => w.toFixed(2) + 'x').join(' -> '));
ok(widths[2] < 1.5, 'a 3-minute glance brackets the cap inside 1.5x (' + widths[2].toFixed(2) + 'x)');

// 3. Floor or round — the estimator must not care, because we do not know which.
console.log('\n3. It does not assume how the product rounds');
[['floor', Math.floor], ['round', Math.round], ['ceil', Math.ceil]].forEach(function (pair) {
  const isect = run(busy, TRUE_CAP, { cadenceMin: 5, round: pair[1] }).isect;
  ok(isect && !isect.contradiction && isect.lo <= TRUE_CAP && isect.hi >= TRUE_CAP,
    'bar rendered with Math.' + pair[0] + ': the bracket still contains the cap');
});

// ---------------------------------------------------------------- fault injection
// Each of these breaks a stated assumption, and the estimator must break with it. A
// bracket that keeps containing the truth through its own violation proves only that
// it is too wide to be saying anything.
console.log('\n4. Fault injection - it must break when its assumptions do');

// 4a. Usage this machine cannot see. THE load-bearing caveat of the whole project:
// claude.ai, a phone or a second machine burn the same meter invisibly, so the units
// the estimator can see are too low and the whole bracket lands too low.
let i = 0;
const hidden = run(busy, TRUE_CAP, { cadenceMin: 5, hide: () => (i++ % 5 === 0) });
ok(hidden.isect && hidden.isect.hi < TRUE_CAP,
  '20% of usage hidden off-machine: the bracket falls BELOW the true cap (' +
  fmt(hidden.isect && hidden.isect.hi) + ' < ' + fmt(TRUE_CAP) + ')');
ok(hidden.isect && hidden.isect.hi / TRUE_CAP < 0.95,
  '  and it under-reads by more than 5%, which is why every figure here is a FLOOR');

// 4b. A real meter reset inside the run: the window re-bases to zero and is renamed.
// Levels either side are incomparable, and a bracket spanning one would read a
// fraction of a window as a whole point of it.
const base = run(busy, TRUE_CAP, { cadenceMin: 5 });
const half = Math.floor(base.readings.length / 2);
const resetAt = Date.parse(base.readings[half].ts);
const withReset = run(busy, TRUE_CAP, { cadenceMin: 5, resetAt: resetAt });
ok(withReset.brackets.length > 0,
  'a mid-run reset still leaves usable brackets (' + withReset.brackets.length +
  ', was ' + base.brackets.length + ')');
ok(withReset.brackets.every(b => contains(b, TRUE_CAP)),
  '  every one still contains the cap, so no bracket spanned the reset');
ok(withReset.isect && !withReset.isect.contradiction &&
   withReset.isect.lo <= TRUE_CAP && withReset.isect.hi >= TRUE_CAP,
  '  and the intersection survives it: ' + fmt(withReset.isect && withReset.isect.lo) +
  ' - ' + fmt(withReset.isect && withReset.isect.hi));

// 4c. A changed reset instant means a new window even when the level rises through it,
// which is the only clue a reset leaves when it happens to land on the same number.
// A label change only destroys a bracket if it lands INSIDE one, so put it there
// deliberately rather than hoping the midpoint falls between two ticks.
const boundary = (() => {
  const rs = base.readings;
  const at = i => Date.parse(rs[i].ts);
  for (let n = half; n < rs.length - 2; n++) {
    if (rs[n - 1].weeklyPct !== rs[n].weeklyPct || rs[n].weeklyPct !== rs[n + 1].weeklyPct) continue;
    // The half that moves into the new window must contain some usage, or "it loses
    // that half" is not a claim about anything: a bar can hold one level for an hour
    // simply because nobody was working, and then the span in UNITS does not shrink.
    let f = n;
    while (f > 0 && rs[f - 1].weeklyPct === rs[n].weeklyPct) f--;
    const lost = units(busy.filter(r => {
      const t = Date.parse(r.ts);
      return t > at(f) && t <= at(n);
    }));
    if (lost > 0) return n;
  }
  return half;
})();
const boundaryTs = Date.parse(base.readings[boundary].ts);
const relabelled = base.readings.map((r, n) =>
  n >= boundary ? Object.assign({}, r, { weeklyReset: '2026-01-08T00:00:00Z' }) : r);
const relabelledBrackets = M.tickBrackets(relabelled, busy, MODEL, M.METERS.weekly);
ok(relabelledBrackets.every(b =>
    Date.parse(b.heldTo) < boundaryTs || Date.parse(b.heldFrom) >= boundaryTs),
  'a changed weekly reset instant splits the run: no bracket draws on both sides of it');
const spanAt = (bs, v) => Math.max.apply(null, [0].concat(bs.filter(b => b.level === v).map(b => b.capLo)));
const vb = base.readings[boundary].weeklyPct;
ok(spanAt(base.brackets, vb) === 0 || spanAt(relabelledBrackets, vb) < spanAt(base.brackets, vb),
  '  and the level straddling it loses the half that moved to the new window');
ok(relabelledBrackets.every(b => contains(b, TRUE_CAP)),
  '  what survives the split still contains the cap');

// 4e. A bar that advances MORE SLOWLY than our unit model says it should. That is what
// a wrong alpha or beta would look like — the fitted unit over-counting relative to
// whatever Anthropic actually meters — and it is the failure the five-hour fit cannot
// catch on its own. Squash five points of the scale into one and the brackets stop
// being mutually satisfiable. The estimator must SAY that rather than average it into
// a plausible-looking answer; a lower bound above an upper bound is how it says so.
const v0 = base.readings[boundary].weeklyPct;
const squash = p => p < v0 ? p : (p <= v0 + 4 ? v0 : p - 4);
const corrupted = base.readings.map(r => Object.assign({}, r, { weeklyPct: squash(r.weeklyPct) }));
const corruptedIsect = M.intersectBrackets(M.tickBrackets(corrupted, busy, MODEL, M.METERS.weekly));
ok(corruptedIsect && corruptedIsect.contradiction,
  'a bar moving slower than the unit model predicts is reported as a CONTRADICTION (' +
  fmt(corruptedIsect && corruptedIsect.lo) + ' at least, ' +
  fmt(corruptedIsect && corruptedIsect.hi) + ' at most)');

// 4d. A level seen once, with nothing either side, is no evidence and must yield none.
const sparse = run(busy, TRUE_CAP, { cadenceMin: 180 });
ok(sparse.brackets.every(b => b.capLo > 0 || b.capHi != null),
  'no bracket is emitted from a level seen once with nothing around it');
ok(sparse.isect == null || (sparse.isect.lo <= TRUE_CAP && sparse.isect.hi >= TRUE_CAP),
  '  a three-hour cadence still brackets honestly, just uselessly wide (' +
  fmt(sparse.isect && sparse.isect.lo) + ' - ' + fmt(sparse.isect && sparse.isect.hi) + ')');

// 5. The arithmetic ceiling from FRESHNESS B6, asserted on the estimator's own output.
console.log('\n5. The 33.6x ceiling from FRESHNESS B6 still holds');
ok(base.isect.lo / MODEL.cap <= 168 / 5,
  'no simulated lower bound exceeds 33.6 five-hour caps (' +
  (base.isect.lo / MODEL.cap).toFixed(1) + 'x)');

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall tick-bracket tests pass');
process.exit(fail ? 1 : 0);
