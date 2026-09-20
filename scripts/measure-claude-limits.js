#!/usr/bin/env node
/**
 * Legerly — measure Anthropic's consumer usage limits from Claude Code transcripts.
 *
 * Anthropic meters two windows (5-hour, weekly) and publishes neither denominator.
 * MEASURE-CLAUDE-LIMITS.md's first protocol read percentages off a screenshot and
 * paired them with an EcoMeter export. That instrument is wrong for this job:
 * EcoMeter watches the claude.ai DOM, and Claude Code usage never touches a browser.
 *
 * The right instrument was already on disk. The .jsonl transcripts under
 * ~/.claude/projects record every API request with exact input / cache_creation
 * (5m and 1h split) / cache_read / output counts, model, and timestamp. That makes
 * caching a measured field rather than the protocol's headline caveat.
 *
 * TWO COUNTING TRAPS, both found the hard way on 2026-09-02:
 *
 *  1. One assistant message is written to the transcript ONCE PER CONTENT BLOCK,
 *     and every copy carries the identical, complete usage object. Summing lines
 *     over-counts by the number of blocks (2.3x on a real session). Dedupe on
 *     message.id — NOT on requestId (one requestId can span several messages) and
 *     NOT on line count. Claude Code's own usage panel gets this wrong: its token
 *     breakdown shows the summed figure while its Cost row shows the deduped one.
 *     We matched its Cost to the cent and its token rows not at all.
 *
 *  2. Anthropic rounds a window's reset time UP to the next 10-minute boundary, so
 *     resetsAt minus five hours can precede the window's real first request by up
 *     to 10 minutes. A gap larger than that means usage we cannot see opened the
 *     window; that sample is contaminated, so drop it rather than average it in.
 *
 * WHAT IT MEASURES. A 429 rejection is a 100% observation of the five-hour window,
 * needing no percentage reading at all. With several of them we solve for the
 * accounting rule that makes them agree, then state the cap in that unit.
 *
 * Usage:
 *   node scripts/measure-claude-limits.js                    # fit and report
 *   node scripts/measure-claude-limits.js --json             # machine-readable
 *   node scripts/measure-claude-limits.js --readings f.json  # + panel readings
 *
 * READINGS ARE NOW WORTH TAKING OFTEN. Two readings far apart give a level pair, whose
 * error is +/-1 rounded point at BOTH ends -- about +/-50% on a one-point move, and no
 * amount of token precision improves it. Readings taken every few minutes instead let
 * the bar be caught TICKING, and a tick carries no rounding error at all. Same file,
 * same fields; just more rows. See tickBrackets below.
 *
 * SCOPE, AND ON THIS ACCOUNT IT IS ALREADY VIOLATED: this reads one machine's Claude
 * Code transcripts. Any use of claude.ai, mobile, or a second machine on the same
 * account counts against the same meters and is invisible here, which biases every
 * cap DOWNWARD. Claude Code's own panel says the same of itself ("this machine
 * only, excludes claude.ai").
 *
 * On 2026-09-02 the account holder confirmed Claude Code on one machine was all he
 * used, and every figure here rested on that. On 2026-09-05 the `quiet` column made
 * the claim testable -- pairs sort monotonically by how long the transcripts fall
 * silent, 11 minutes reading 13.3x and 317 minutes reading 3.1x -- and asked again,
 * he confirmed claude.ai and the phone. THE CONFIRMATION IS RETRACTED. Everything
 * this script prints is a contaminated floor, not a measurement of the plan, until a
 * run is done with the browser and phone deliberately untouched.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO = path.join(__dirname, '..');
const PRICES = JSON.parse(fs.readFileSync(path.join(REPO, 'extension/prices.json'), 'utf8')).api.anthropic;

// Cache multipliers are Anthropic's published API structure, NOT from prices.json,
// which carries only base input/output. If these move, this comment is the only
// thing that will tell you where they came from.
const CACHE = { write5m: 1.25, write1h: 2.0, read: 0.10 };
const WINDOW_MS = 5 * 3600 * 1000;
const MAX_UNSEEN_MIN = 15;   // 10-minute reset rounding, plus slack
const HOURS_PER_WEEK = 168;

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const asJson = args.includes('--json');
const projectsDir = argVal('--projects') || path.join(os.homedir(), '.claude', 'projects');
const readingsFile = argVal('--readings');

// ---------------------------------------------------------------- read
function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

function load(dir) {
  const byMessage = new Map();   // message.id -> one record. See trap 1.
  const rejections = [];
  let lines = 0, blockDupes = 0;
  for (const file of walk(dir)) {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      lines++;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.quotaLimits && o.quotaLimits.resetsAt) {
        // rateLimitType names WHICH meter fired, and it is the field that makes the
        // weekly closable the same way the five-hour was. Every rejection on disk so
        // far reads "five_hour"; a weekly-flavoured one would be a 100% observation of
        // the weekly cap carrying NO percentage rounding at all, so it must never be
        // dropped quietly. The overage fields say whether paid credits were topping the
        // window up -- if they were, the window is not a clean read of the plan cap.
        const q = o.quotaLimits;
        rejections.push({
          ts: o.timestamp, type: q.rateLimitType, resetsAt: q.resetsAt,
          overageStatus: q.overageStatus, usingOverage: q.isUsingOverage,
          overageDisabledReason: q.overageDisabledReason,
        });
      }
      const u = o.message && o.message.usage;
      if (o.type !== 'assistant' || !u) continue;
      const id = o.message.id;
      if (!id) continue;
      if (byMessage.has(id)) { blockDupes++; continue; }
      const cc = u.cache_creation || {};
      byMessage.set(id, {
        ts: o.timestamp,
        model: o.message.model,
        session: o.sessionId,
        input: u.input_tokens || 0,
        output: u.output_tokens || 0,
        cacheWrite: u.cache_creation_input_tokens || 0,
        write5m: cc.ephemeral_5m_input_tokens || 0,
        write1h: cc.ephemeral_1h_input_tokens || 0,
        cacheRead: u.cache_read_input_tokens || 0,
      });
    }
  }
  const requests = [...byMessage.values()]
    .filter(r => r.ts && r.model && r.model !== '<synthetic>')
    .sort((a, b) => a.ts.localeCompare(b.ts));
  return { requests, rejections, lines, blockDupes };
}

// ---------------------------------------------------------------- cost
const rate = model => PRICES[model] || PRICES[String(model).replace(/-\d+$/, '')] || null;

function costOf(r) {
  const p = rate(r.model);
  if (!p) return null;                       // an unpriced model must not silently cost 0
  const other = Math.max(0, r.cacheWrite - r.write5m - r.write1h);
  return r.input * p.input
    + r.write5m * CACHE.write5m * p.input
    + (r.write1h + other) * CACHE.write1h * p.input
    + r.cacheRead * CACHE.read * p.input
    + r.output * p.output;
}

function totalsOf(rs) {
  const t = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, cost: 0, n: rs.length, unpriced: 0 };
  for (const r of rs) {
    t.input += r.input; t.output += r.output;
    t.cacheWrite += r.cacheWrite; t.cacheRead += r.cacheRead;
    const c = costOf(r);
    if (c === null) t.unpriced++; else t.cost += c;
  }
  return t;
}
const modelMix = rs => rs.reduce((m, r) => (m[r.model] = (m[r.model] || 0) + 1, m), {});

// ---------------------------------------------------------------- windows
// An untyped rejection predates the field and is assumed five-hour, which is what
// every typed one on disk has been. Anything else is the prize, so the caller reports
// the leftovers rather than letting this filter swallow them.
const isFiveHour = r => r.type === 'five_hour' || !r.type;

function fiveHourWindows(requests, rejections) {
  const seen = new Set();
  const out = [];
  const rs = rejections
    .filter(isFiveHour)
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  for (const rj of rs) {
    if (!rj.resetsAt || seen.has(rj.resetsAt)) continue;   // two hits in one window are one observation
    seen.add(rj.resetsAt);
    const end = rj.resetsAt * 1000;
    const start = end - WINDOW_MS;
    const hit = Date.parse(rj.ts);
    const inWin = requests.filter(r => { const t = Date.parse(r.ts); return t >= start && t <= hit; });
    if (!inWin.length) continue;
    out.push({
      start, hit, requests: inWin,
      unseenMin: (Date.parse(inWin[0].ts) - start) / 60000,
      totals: totalsOf(inWin), models: modelMix(inWin),
    });
  }
  return out;
}

// ---------------------------------------------------------------- fit
// The limit is not the bill. Solve for the unit in which the 100% observations
// agree: units = input + cache_write + alpha*cache_read + beta*output.
//
// ⚠️ THE ESTIMATOR CHANGED ON 2026-09-06, AND THE REASON MATTERS. It used to take the
// MEAN of the windows and pick (alpha, beta) to minimise their spread. That is the right
// thing to do when the errors are symmetric. They are not. Usage on claude.ai, a phone or
// a second machine burns the same meter and is invisible here, so a window's visible
// units can only ever be too SMALL. Every 429 is therefore a LOWER BOUND on the cap, and
// a window far below the others is measuring contamination, not a smaller limit.
//
// Minimising spread across a one-sided sample does real damage. A seventh window arrived
// on 2026-09-05 at a fifth of the usage of any other, and the CV fit answered by dragging
// beta from 7.75 to 21.5 and the cap from 3.09M to 5.05M -- distorting the unit to
// accommodate a window that was mostly spent somewhere else.
//
// So: the cap is the UPPER ENVELOPE, max_i units_i, and nothing is discarded -- a
// contaminated window simply sits below the envelope, where its distance from it
// measures how much was spent off-machine.
const cv = v => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)) / m;
};
const unitsOf = (t, a, b) => t.input + t.cacheWrite + a * t.cacheRead + b * t.output;

// One-sided spread: the mean distance below the envelope, scale-free. This is what CV
// becomes once you accept that the errors only ever subtract.
const shortfall = v => {
  const mx = Math.max(...v);
  return mx > 0 ? v.reduce((s, x) => s + (mx - x), 0) / v.length / mx : Infinity;
};

// The OLD estimator, kept only so the report can show what changed. A project that
// grades other people's disclosure does not get to quietly swap its own method.
function fitByMeanSpread(windows) {
  if (windows.length < 2) return null;
  let best = null;
  for (let a = 0; a <= 1.0001; a += 0.01) {
    for (let b = 0; b <= 40; b += 0.25) {
      const c = cv(windows.map(w => unitsOf(w.totals, a, b)));
      if (!best || c < best.cv) best = { alpha: +a.toFixed(2), beta: +b.toFixed(2), cv: c };
    }
  }
  const values = windows.map(w => unitsOf(w.totals, best.alpha, best.beta));
  best.cap = values.reduce((a, b) => a + b, 0) / values.length;
  best.spread = Math.max(...values) / Math.min(...values);
  return best;
}

// ALPHA IS IMPOSED AT 0, NOT FITTED, and that is a deliberate correction made while
// testing this estimator on 2026-09-06.
//
// Cache reads run 16M-111M per window against 0.9M-1.7M of cache writes and 0.14M-0.30M
// of output. The cache-read term is one to two ORDERS OF MAGNITUDE larger than everything
// else, so a hair of alpha swamps the unit and can buy agreement for free. Left free, the
// search does exactly that: on synthetic windows with a known answer it wandered to
// alpha 0.04 and returned a beta less than half the truth. That alpha came back 0 on the
// real rejections was partly luck, and an estimator that depends on luck is not one to
// publish from.
//
// So alpha is fixed, and the claim "cache reads weigh nothing" is carried by EVIDENCE
// reported alongside the fit rather than by the fit having chosen it:
//   - a free one-sided search over the real rejections does put it at 0 (fitAlpha below,
//     kept as a diagnostic), and holds it there when the contaminated window is added;
//   - at the BILLING weight of 0.1, with beta re-optimised in its favour, the two
//     families disagree by 36% instead of 0.0%;
//   - the one exact-agreement branch off zero needs alpha 0.02 with beta 36 -- output
//     weighing seven times what the price list charges -- which is the degeneracy above,
//     not a rival answer. It is rejected here rather than left for someone to rediscover.
const ALPHA = 0;

// Diagnostic only: what a free one-sided search would say about alpha. Reported so the
// imposition above can be checked rather than trusted.
function fitAlpha(windows, fixedAlpha) {
  let best = null;
  for (let a = 0; a <= 1.0001; a += 0.01) {
    if (fixedAlpha != null && Math.abs(a - fixedAlpha) > 1e-9) continue;
    for (let b = 0; b <= 40; b += 0.25) {
      const s = shortfall(windows.map(w => unitsOf(w.totals, a, b)));
      if (!best || s < best.s) best = { alpha: +a.toFixed(2), beta: +b.toFixed(2), s };
    }
  }
  return best;
}

// STAGE 2: beta, by RECONCILING TWO INDEPENDENT OBSERVATION FAMILIES.
//
// Beta is badly identified by the rejections on their own -- minimising CV said 21.5,
// minimising shortfall said 4.75, on the same seven windows. So it is not taken from
// them. A panel delta ("the five-hour bar moved 12 points while we spent these tokens")
// implies a cap too, from data the rejection fit never sees. Both families are lower
// bounds under contamination, so if beta is right their HIGHEST members should name the
// same cap. The beta where they agree is the estimate.
//
// ⚠️ WHY ALPHA IS NOT FITTED HERE TOO. Two unknowns against one equation has a curve of
// exact solutions, and the 2-D search happily returns alpha 0.02 / beta 36 / cap 14M with
// perfect agreement. It is spurious: cache reads run 16M-111M per window, so any nonzero
// alpha lets that term swamp everything and buy agreement for free. Alpha comes from
// stage 1, where the rejections constrain it, and the degenerate branch is rejected here
// rather than left for someone to rediscover and believe.
function reconcileBeta(windows, deltas, alpha) {
  if (!windows.length || !deltas.length) return null;
  const capFrom429 = b => Math.max(...windows.map(w => unitsOf(w.totals, alpha, b)));
  const capFromPanel = b => Math.max(...deltas.map(d => unitsOf(d.totals, alpha, b) / (d.d5 / 100)));
  const disagreement = b => {
    const x = capFrom429(b), y = capFromPanel(b);
    return (x > 0 && y > 0) ? Math.abs(Math.log(x / y)) : Infinity;
  };
  let best = null;
  for (let b = 0; b <= 40; b += 0.05) {
    const g = disagreement(b);
    if (!best || g < best.g) best = { beta: +b.toFixed(2), g };
  }
  // The band where the two families still agree within 2% is the honest error bar on
  // beta, and it is what the cap's range is quoted from.
  const band = [];
  for (let b = 0; b <= 40; b += 0.05) if (Math.exp(disagreement(b)) - 1 <= 0.02) band.push(b);
  return {
    beta: best.beta,
    disagreement: Math.exp(best.g) - 1,
    betaRange: band.length ? [+band[0].toFixed(2), +band[band.length - 1].toFixed(2)] : null,
    capFrom429: capFrom429(best.beta),
    capFromPanel: capFromPanel(best.beta),
  };
}

// The estimator proper: alpha imposed, beta from reconciliation when panel deltas exist,
// and the cap as the upper envelope of everything we have.
//
// ⚠️ THE LOWER-BOUND GUARANTEE IS CONDITIONAL, and the condition is not satisfied on this
// account. Measured over synthetic samples with a known answer (test-limit-envelope.js):
//
//   at the TRUE beta                      envelope <= truth, always
//   with one clean window AND one clean
//     panel delta                         fitted cap <= truth, always
//   with NOTHING clean in either family   the cap overshoots in about a third of samples,
//                                         badly, and capRange does not rescue it
//
// The exact rates are printed by that test rather than copied here, because a figure
// duplicated into a comment is a figure that goes stale unwatched.
//
// So "the cap is at least X" holds only if at least one observation in each family was
// uncontaminated. When everything is contaminated there is no anchor, beta drifts high,
// and the envelope inflates with it. We do NOT know that any window on this account is
// clean -- claude.ai and mobile are in use -- so the ">=" is conditional, and the way to
// earn it is a run with the browser and phone deliberately untouched.
function fitEnvelope(windows, deltas, alpha) {
  if (windows.length < 2) return null;
  const a = alpha == null ? ALPHA : alpha;
  const free = fitAlpha(windows);            // diagnostic, not used to fit
  const rec = reconcileBeta(windows, deltas || [], a);
  const beta = rec ? rec.beta : fitAlpha(windows, a).beta;
  const values = windows.map(w => unitsOf(w.totals, a, beta));
  const cap = Math.max(...values);
  const out = {
    alpha: a, beta: beta, cap: cap, values: values,
    alphaImposed: alpha == null, alphaIfFreelyFitted: free.alpha,
    betaFrom: rec ? 'reconciled with panel deltas' : 'rejections only - weakly identified',
    reconciliation: rec,
    betaRange: rec ? rec.betaRange : null,
    // Distance below the envelope, per window. Under a one-sided error model this is
    // not residual noise: it is an estimate of how much of that window was spent on
    // claude.ai, a phone, or another machine.
    shortfalls: values.map(v => 1 - v / cap),
    capRange: rec && rec.betaRange
      ? rec.betaRange.map(b => Math.max(...windows.map(w => unitsOf(w.totals, a, b))))
      : null,
  };
  // Cache reads at their BILLING weight, beta re-optimised in their favour so the
  // comparison is fair. Stated as disagreement between the two families, which is the
  // criterion this fit actually uses.
  if (deltas && deltas.length) {
    const alt = reconcileBeta(windows, deltas, CACHE.read);
    out.disagreementAtBillingCacheRead = alt ? alt.disagreement : null;
  }
  return out;
}

// ---------------------------------------------------------------- readings
// A readings file is a JSON array of panel observations:
//   [{"ts":"2026-09-02T16:26:35Z","fiveHourPct":17,"weeklyPct":4,"weeklyReset":"Sat 2:00 AM"}]
// Consecutive pairs give a ratio without needing to know when a window opened.
// true / false / null(unknown) — whether two readings name the same weekly window.
// Unknown must NOT invalidate a pair: a missing label is not evidence of a reset.
function sameWeeklyWindow(a, b) {
  if (!a || !b) return null;
  const pa = Date.parse(a), pb = Date.parse(b);
  if (!isNaN(pa) && !isNaN(pb)) return Math.abs(pa - pb) < 60000;
  if (!isNaN(pa) !== !isNaN(pb)) return null;   // one exact, one a human label: cannot compare
  return a.trim() === b.trim();
}

// Panel deltas for the FIVE-HOUR meter, model-free, because they are an INPUT to the
// fit rather than an output of it. Only a pair where the bar ROSE is usable: a fall
// means the window reset in between, so the two levels bound different windows.
function fiveHourDeltas(readings, requests) {
  const out = [];
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1], b = readings[i];
    const t0 = Date.parse(a.ts), t1 = Date.parse(b.ts);
    if (!(t1 > t0)) continue;
    const d5 = b.fiveHourPct - a.fiveHourPct;
    if (!(d5 > 0)) continue;
    const span = requests.filter(r => { const t = Date.parse(r.ts); return t > t0 && t <= t1; });
    if (!span.length) continue;
    out.push({ from: a.ts, to: b.ts, d5: d5, n: span.length, totals: totalsOf(span) });
  }
  return out;
}

function pairReadings(readings, requests, model) {
  const out = [];
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1], b = readings[i];
    const t0 = Date.parse(a.ts), t1 = Date.parse(b.ts);
    if (!(t1 > t0)) continue;
    const span = requests.filter(r => { const t = Date.parse(r.ts); return t > t0 && t <= t1; });
    if (!span.length) continue;
    const t = totalsOf(span);
    // The longest stretch inside the pair with no visible request. A meter that climbs
    // through a long silence is being fed from somewhere this machine cannot see, and
    // that pair's cap will come out far too low. Ends count: silence after the last
    // request is exactly the case that matters.
    let quiet = 0, cursor = t0;
    for (const r of span) {
      quiet = Math.max(quiet, Date.parse(r.ts) - cursor);
      cursor = Date.parse(r.ts);
    }
    quiet = Math.max(quiet, t1 - cursor) / 60000;

    const units = unitsOf(t, model.alpha, model.beta);
    const d5 = b.fiveHourPct - a.fiveHourPct;
    const dw = b.weeklyPct - a.weeklyPct;
    out.push({
      from: a.ts, to: b.ts, n: span.length, units, cost: t.cost, d5, dw, quiet,
      fiveHourCap: d5 > 0 ? units / (d5 / 100) : null,
      // Each reading is rounded, so a delta of d carries +/-1 point either way.
      weeklyCap: dw > 0 ? units / (dw / 100) : null,
      weeklyCapLo: dw > 0 ? units / ((dw + 1) / 100) : null,
      weeklyCapHi: dw > 1 ? units / ((dw - 1) / 100) : null,
      // Only a WEEKLY reset invalidates a weekly ratio; the five-hour window resetting
      // in between is normal and harmless. Compare reset labels as instants where they
      // parse, because the same moment gets written both "Sat 2:00 AM" (screenshot) and
      // "2026-09-05T06:00:00Z" (copy button), and a string compare calls those different.
      reset: sameWeeklyWindow(a.weeklyReset, b.weeklyReset) === false || dw < 0,
    });
  }
  return out;
}

// ------------------------------------------------------------- tick brackets
// A pair of LEVEL readings cannot beat about +/-50%, because both ends are rounded to
// a whole percent. Ticks carry no such error: between the instant the bar turns
// v-1 -> v and the instant it turns v -> v+1, exactly one point of the cap is spent.
//
// A tick is never seen directly, only inferred from the bar reading v at one glance
// and v+1 at the next, so both the tick and the usage between two of them are
// BRACKETED rather than known:
//
//   certainly INSIDE the one-point span : first sighting of v  -> last sighting of v
//   certainly CONTAINS it               : last sighting of v-1 -> first sighting of v+1
//
// so the cap lies in [100 * inside, 100 * contains]. Nothing is assumed about rounding,
// and the bracket tightens by itself as glances get denser -- keep the popover open and
// the two bounds converge. Intersecting several brackets is what beats quantisation.
const METERS = {
  weekly:   { name: 'weekly',    pct: 'weeklyPct',   reset: 'weeklyReset' },
  fiveHour: { name: 'five-hour', pct: 'fiveHourPct', reset: 'fiveHourReset' },
};

function tickBrackets(readings, requests, model, meter) {
  const unitsBetween = (t0, t1) => unitsOf(
    totalsOf(requests.filter(r => { const t = Date.parse(r.ts); return t > t0 && t <= t1; })),
    model.alpha, model.beta);

  // Split into runs sharing one window. A fall in the level, or a changed reset
  // instant, means the meter reset and levels either side of it are incomparable.
  const runs = [[]];
  for (const r of readings) {
    if (typeof r[meter.pct] !== 'number' || isNaN(Date.parse(r.ts))) continue;
    const cur = runs[runs.length - 1], prev = cur[cur.length - 1];
    if (prev && (r[meter.pct] < prev[meter.pct] ||
        sameWeeklyWindow(prev[meter.reset], r[meter.reset]) === false)) runs.push([]);
    runs[runs.length - 1].push(r);
  }

  const out = [];
  for (const run of runs) {
    const first = new Map(), last = new Map();
    for (const r of run) {
      const v = r[meter.pct], t = Date.parse(r.ts);
      if (!first.has(v)) first.set(v, t);
      last.set(v, t);
    }
    for (const v of [...first.keys()].sort((a, b) => a - b)) {
      if (!first.has(v + 1)) continue;                       // closing tick never seen
      const inside = last.get(v) > first.get(v) ? unitsBetween(first.get(v), last.get(v)) : 0;
      const contains = last.has(v - 1) ? unitsBetween(last.get(v - 1), first.get(v + 1)) : null;
      if (!inside && contains === null) continue;            // one glance says nothing
      out.push({
        meter: meter.name, level: v,
        heldFrom: new Date(first.get(v)).toISOString(),
        heldTo: new Date(last.get(v)).toISOString(),
        capLo: inside * 100,
        capHi: contains === null ? null : contains * 100,
      });
    }
  }
  return out;
}

// The tightest claim several brackets support is their intersection. If that comes out
// empty -- a lower bound above an upper one -- the brackets CONTRADICT, and the usual
// cause is usage this machine cannot see inflating one of the intervals. Say so; do
// not average the contradiction away.
function intersectBrackets(bs) {
  const los = bs.map(b => b.capLo).filter(x => x > 0);
  const his = bs.map(b => b.capHi).filter(x => x != null);
  if (!los.length && !his.length) return null;
  const lo = los.length ? Math.max(...los) : null;
  const hi = his.length ? Math.min(...his) : null;
  return { lo, hi, contradiction: lo != null && hi != null && lo > hi, n: bs.length };
}

// Exported so scripts/test-limit-ticks.js can exercise the estimator against a meter
// whose answer is known. Top-level return is legal in CommonJS and keeps the report
// below un-indented, so the diff stays readable.
module.exports = {
  load, totalsOf, unitsOf, fiveHourWindows, isFiveHour, shortfall,
  fitEnvelope, fitAlpha, reconcileBeta, fitByMeanSpread, fiveHourDeltas,
  pairReadings, sameWeeklyWindow, tickBrackets, intersectBrackets, METERS, CACHE,
};
if (require.main !== module) return;

// ---------------------------------------------------------------- report
const { requests, rejections, lines, blockDupes } = load(projectsDir);
if (!requests.length) {
  console.error('No transcripts found under ' + projectsDir);
  process.exit(1);
}

const all = totalsOf(requests);
const windows = fiveHourWindows(requests, rejections);
const clean = windows.filter(w => w.unseenMin < MAX_UNSEEN_MIN);

// Readings are loaded BEFORE the fit now: their five-hour deltas are what identifies
// beta. Under the envelope estimator no window is discarded -- a contaminated one sits
// below the envelope instead of dragging a mean -- so the fit sees all of them, and
// `clean` survives only to reproduce the superseded figure for comparison.
const readings = readingsFile ? JSON.parse(fs.readFileSync(readingsFile, 'utf8')) : [];
const deltas = fiveHourDeltas(readings, requests);
const model = fitEnvelope(windows, deltas);
const superseded = fitByMeanSpread(clean.length >= 2 ? clean : windows);
const pairs = model ? pairReadings(readings, requests, model) : [];
const ticks = {
  weekly: model ? tickBrackets(readings, requests, model, METERS.weekly) : [],
  fiveHour: model ? tickBrackets(readings, requests, model, METERS.fiveHour) : [],
};
// Rejections carry their own meter name; anything not five-hour is the observation
// this whole file is waiting for, so it is surfaced rather than filtered away.
const otherMeter = rejections.filter(r => !isFiveHour(r));

if (asJson) {
  console.log(JSON.stringify({
    generated: new Date().toISOString(),
    scope: 'Claude Code transcripts on this machine only; excludes claude.ai and any other device',
    source: { dir: projectsDir, lines, requests: requests.length, contentBlockDuplicatesSkipped: blockDupes },
    span: { from: requests[0].ts, to: requests[requests.length - 1].ts },
    allTime: all,
    rejections: rejections.length,
    fiveHourObservations: windows.map(w => ({
      windowStart: new Date(w.start).toISOString(),
      hitAt: new Date(w.hit).toISOString(),
      unseenMinAtStart: +w.unseenMin.toFixed(1),
      contaminated: w.unseenMin >= MAX_UNSEEN_MIN,
      models: w.models, ...w.totals,
    })),
    model: model && {
      estimator: 'upper envelope — every 429 is a lower bound, so the cap is the max, not the mean',
      unit: `input + cache_write + ${model.alpha} * cache_read + ${model.beta} * output`,
      cacheReadWeight: model.alpha, outputWeight: model.beta,
      outputWeightFrom: model.betaFrom, outputWeightRange: model.betaRange,
      fiveHourCapUnitsAtLeast: model.cap, fiveHourCapRange: model.capRange,
      reconciliation: model.reconciliation && {
        capFromRejections: model.reconciliation.capFrom429,
        capFromPanelDeltas: model.reconciliation.capFromPanel,
        disagreement: model.reconciliation.disagreement,
        panelDeltasUsed: deltas.length,
      },
      disagreementIfCacheReadAtBillingWeight: model.disagreementAtBillingCacheRead ?? null,
      // Distance below the envelope per window: an estimate of off-machine usage.
      shortfallByWindow: windows.map((w, i) => ({
        windowStart: new Date(w.start).toISOString(),
        units: model.values[i], shortfall: model.shortfalls[i],
      })),
      n: windows.length,
      superseded: superseded && {
        method: 'minimise spread about the mean', outputWeight: superseded.beta,
        fiveHourCapUnits: superseded.cap, n: (clean.length >= 2 ? clean : windows).length,
      },
    },
    rejectionMeters: rejections.map(r => ({
      ts: r.ts, rateLimitType: r.type || null, usingOverage: r.usingOverage ?? null,
      overageStatus: r.overageStatus ?? null, overageDisabledReason: r.overageDisabledReason ?? null,
    })),
    weekly: {
      arithmeticCeilingRatio: HOURS_PER_WEEK / 5, pairs,
      tickBrackets: ticks.weekly, tickBracketIntersection: intersectBrackets(ticks.weekly),
    },
    fiveHourTickControl: {
      brackets: ticks.fiveHour, intersection: intersectBrackets(ticks.fiveHour),
    },
  }, null, 2));
  process.exit(0);
}

const M = x => (x / 1e6).toFixed(2) + 'M';
const K = x => (x / 1e3).toFixed(0) + 'k';

console.log('\nCLAUDE USAGE LIMITS - measured from Claude Code transcripts');
console.log('  Claude Code on this machine only; excludes claude.ai and any other device.');
console.log('  !! This account ALSO uses claude.ai and mobile (confirmed 2026-09-05), so every');
console.log('     figure below is a contaminated FLOOR, not a measurement of the plan. A clean');
console.log('     run means not touching the browser or the phone while it is in progress.');
console.log(`  ${requests.length} requests over ${lines} lines (${blockDupes} content-block duplicates skipped)`);
console.log(`  ${requests[0].ts.slice(0, 10)} .. ${requests[requests.length - 1].ts.slice(0, 10)}   ` +
  `${M(all.input + all.cacheWrite + all.cacheRead + all.output)} tokens, $${all.cost.toFixed(2)} at prices.json rates`);
if (all.unpriced) console.log(`  !! ${all.unpriced} requests on a model absent from prices.json - cost is incomplete`);

console.log('\nFIVE-HOUR WINDOW - each row is a 429, i.e. a 100% observation');
console.log('  window start (UTC)  unseen  reqs   cache_w   cache_r   output      cost');
for (const w of windows) {
  console.log('  ' + new Date(w.start).toISOString().slice(0, 16) +
    String(w.unseenMin.toFixed(0) + 'm').padStart(8) + String(w.totals.n).padStart(6) +
    M(w.totals.cacheWrite).padStart(10) + M(w.totals.cacheRead).padStart(10) +
    K(w.totals.output).padStart(9) + ('$' + w.totals.cost.toFixed(0)).padStart(10) +
    // Nothing is excluded any more. Under the envelope estimator a window opened by
    // usage we could not see simply sits low, and its shortfall below says how far.
    (w.unseenMin >= MAX_UNSEEN_MIN ? '   <- opened ' + w.unseenMin.toFixed(0) + 'm before our first request' : ''));
}

// The rejections self-describe, and two of those fields are load-bearing. rateLimitType
// says which meter fired -- so "these are five-hour observations" is read off the record
// rather than assumed. The overage fields say whether paid credits were extending the
// window, which would make it an observation of a purchase and not of the plan.
if (windows.length) {
  const typed = rejections.filter(r => r.type);
  const kinds = [...new Set(typed.map(r => r.type))];
  const overaged = rejections.filter(r => r.usingOverage);
  console.log('\n  Self-labelled: ' + typed.length + '/' + rejections.length +
    ' rejections carry rateLimitType' +
    (kinds.length ? ' = ' + kinds.map(k => '"' + k + '"').join(', ') : '') + ',');
  console.log('  so these are five-hour observations by the record, not by assumption.');
  if (overaged.length) {
    console.log('  !! ' + overaged.length + ' ran on paid overage - not a clean read of the plan cap.');
  } else {
    const why = [...new Set(rejections.map(r => r.overageDisabledReason).filter(Boolean))];
    console.log('  None ran on paid overage, so no credit purchase inflated any window' +
      (why.length ? ' (' + why.join(', ') + ').' : '.'));
  }
}

if (otherMeter.length) {
  console.log('\n  ** A REJECTION FROM ANOTHER METER IS ON DISK - this is the prize. **');
  for (const r of otherMeter) {
    console.log('     ' + r.ts + '  rateLimitType="' + r.type + '"  resets ' +
      new Date(r.resetsAt * 1000).toISOString());
  }
  console.log('     A non-five-hour 429 is a 100% observation of that meter, carrying NO');
  console.log('     percentage rounding. If it says weekly, the weekly cap can be read the');
  console.log('     same way the five-hour one was. Teach fiveHourWindows about it and refit.');
}

if (model) {
  const opus = rate('claude-opus-5');
  const rec = model.reconciliation;
  console.log('\n  THE CAP IS THE UPPER ENVELOPE, NOT THE MEAN. Off-machine usage can only make a');
  console.log('  window’s visible units too SMALL, so every 429 is a LOWER bound and a window far');
  console.log('  below the others is measuring contamination, not a smaller limit.');
  console.log(`\n  unit: input + cache_write + ${model.alpha} * cache_read + ${model.beta} * output`);
  console.log(`  cache reads weigh ${model.alpha}` +
    (model.disagreementAtBillingCacheRead != null
      ? `; at their BILLING weight (${CACHE.read}) the two families disagree by ` +
        `${(model.disagreementAtBillingCacheRead * 100).toFixed(0)}% instead of ` +
        `${(rec.disagreement * 100).toFixed(1)}%.`
      : ' (from the one-sided spread of the rejections).'));
  console.log(`  output weight ${model.beta} against ${(opus.output / opus.input).toFixed(0)}x on the price list` +
    ` - ${model.betaFrom}.`);
  if (rec) {
    console.log(`\n  beta is fixed by RECONCILING TWO INDEPENDENT FAMILIES, not by internal spread:`);
    console.log(`    ${windows.length} rejections give a cap of ${M(rec.capFrom429)}`);
    console.log(`    ${deltas.length} panel delta(s) give a cap of ${M(rec.capFromPanel)}`);
    console.log(`    they agree to ${(rec.disagreement * 100).toFixed(1)}% at beta = ${model.beta}` +
      (rec.betaRange ? `, and to within 2% over beta ${rec.betaRange[0]}-${rec.betaRange[1]}` : ''));
  } else {
    console.log('\n  !! No panel deltas supplied, so beta rests on the rejections alone, where it is');
    console.log('     WEAKLY IDENTIFIED - on this data minimising CV said 21.5 and minimising');
    console.log('     shortfall said 4.75. Pass --readings to reconcile it against panel deltas.');
  }
  console.log(`\n  FIVE-HOUR CAP >= ${M(model.cap)} units` +
    (model.capRange ? `   (${M(model.capRange[0])}-${M(model.capRange[1])} over the beta band)` : ''));
  console.log('  ">=" is not hedging: contamination only ever subtracts, so each window is a floor.');
  console.log('  !! But the guarantee is CONDITIONAL on at least one window and one panel delta');
  console.log('     being clean, and on this account that is unproven. With nothing clean the');
  console.log('     envelope overshoots in about a third of simulated samples, badly, and the');
  console.log('     beta band does not rescue it - run scripts/test-limit-envelope.js for the');
  console.log('     measured rates. Earn the ">=" with a run that leaves browser and phone alone.');
  console.log(`  The same windows in dollars: $${Math.min(...windows.map(w => w.totals.cost)).toFixed(0)}-` +
    `$${Math.max(...windows.map(w => w.totals.cost)).toFixed(0)} - wide, because the limit is not the bill.`);

  // Distance below the envelope is not residual noise under a one-sided error model.
  // It estimates how much of that window was spent somewhere this machine cannot see.
  console.log('\n  Shortfall below the envelope = usage this machine could not see:');
  windows.forEach((w, i) => {
    const s = model.shortfalls[i];
    console.log('    ' + new Date(w.start).toISOString().slice(0, 16) +
      M(model.values[i]).padStart(8) +
      String((s * 100).toFixed(0) + '%').padStart(6) +
      (s < 0.005 ? '   <- sets the envelope'
        : s > 0.4 ? '   <- most of this window was spent elsewhere' : ''));
  });

  if (superseded) {
    console.log(`\n  Superseded method, shown because we grade other people’s disclosure: minimising`);
    console.log(`  spread about the MEAN gave beta ${superseded.beta} and a cap of ${M(superseded.cap)} on ` +
      `${(clean.length >= 2 ? clean : windows).length} windows.`);
    console.log('  It moves with contamination; the envelope does not.');
  }
}

console.log('\nWEEKLY WINDOW');
console.log(`  Arithmetic ceiling on weekly/five-hour: ${(HOURS_PER_WEEK / 5).toFixed(1)}x - only that many`);
console.log('  five-hour windows fit in a week. An estimate above it is wrong, not merely high.');
if (!pairs.length) {
  console.log('  No panel readings supplied. Pass --readings <file.json>:');
  console.log('    [{"ts":"2026-09-02T16:26:35Z","fiveHourPct":17,"weeklyPct":4,"weeklyReset":"Sat 2:00 AM"}]');
} else {
  console.log('  from  -> to      reqs     units    d5h    dwk    quiet     5h cap    weekly cap (ratio)');
  for (const p of pairs) {
    const ratio = p.weeklyCap && model ? (p.weeklyCap / model.cap).toFixed(1) + 'x' : '-';
    console.log('  ' + p.from.slice(11, 16) + ' -> ' + p.to.slice(11, 16) +
      String(p.n).padStart(6) + M(p.units).padStart(10) +
      String(p.d5 + 'pp').padStart(7) + String(p.dw + 'pp').padStart(7) +
      String(p.quiet.toFixed(0) + 'm').padStart(9) +
      (p.fiveHourCap ? M(p.fiveHourCap) : '-').padStart(11) +
      '   ' + (p.weeklyCap ? M(p.weeklyCap) : '-') + ' (' + ratio + ')' +
      (p.reset ? '   <- window reset between readings, ratio meaningless' : ''));
  }
  const usable = pairs.filter(p => p.weeklyCap && !p.reset && model);
  if (usable.length) {
    const rs = usable.map(p => p.weeklyCap / model.cap);
    const best = Math.max(...rs);
    console.log(`\n  weekly/five-hour from ${usable.length} pair(s): ` +
      `${Math.min(...rs).toFixed(1)}x - ${Math.max(...rs).toFixed(1)}x` +
      (rs.some(r => r > HOURS_PER_WEEK / 5)
        ? '\n  !! ABOVE THE CEILING - a window reset, or the two meters count different things'
        : ''));
    // Unseen usage can only ever make a pair read LOW: the bar moves by usage we did
    // not see, and we divide the usage we did see by that larger move. So this is not
    // a range to average across -- the HIGHEST pair is the least contaminated floor,
    // and a pair far below it is a detector rather than a smaller answer.
    if (usable.length > 1 && Math.min(...rs) < best * 0.6) {
      console.log('  Off-machine usage biases every pair DOWNWARD, so this is not a range to');
      console.log('  average. The floor is the HIGHEST pair: ' + best.toFixed(1) +
        'x. Pairs far below it are reporting');
      console.log('  usage this machine could not see, and the quiet column says which.');
      for (const p of usable) {
        const r = p.weeklyCap / model.cap;
        if (r < best * 0.6) {
          console.log('    !! ' + p.from.slice(0, 16) + ' -> ' + p.to.slice(0, 16) +
            ' reads ' + r.toFixed(1) + 'x with ' + p.quiet.toFixed(0) +
            ' min of transcript silence while the');
          console.log('       weekly climbed ' + p.dw + 'pp. Something spent that elsewhere.');
        }
      }
    }
  }
}

if (ticks.weekly.length || ticks.fiveHour.length) {
  console.log('\n  TICK BRACKETS - exactly one point of the bar, with no rounding assumed');
  console.log('  meter       level  held (UTC)      cap at least    cap at most');
  for (const b of [...ticks.fiveHour, ...ticks.weekly]) {
    console.log('  ' + b.meter.padEnd(12) + (b.level + '%').padStart(5) + '  ' +
      b.heldFrom.slice(11, 16) + '->' + b.heldTo.slice(11, 16) +
      (b.capLo ? M(b.capLo) : '-').padStart(14) +
      (b.capHi != null ? M(b.capHi) : '-').padStart(15));
  }
  // The five-hour meter is the CONTROL. Its cap is already known from the 429s, so a
  // bracket that fails to contain it condemns the tick method rather than the fit.
  const f = intersectBrackets(ticks.fiveHour);
  if (f && model) {
    const ok = (f.lo == null || model.cap >= f.lo) && (f.hi == null || model.cap <= f.hi);
    console.log('\n  Five-hour ticks are the CONTROL, not a measurement - that cap is already known.');
    console.log('  Bracket ' + (f.lo ? M(f.lo) : '?') + ' - ' + (f.hi != null ? M(f.hi) : '?') +
      ' vs the fitted ' + M(model.cap) + ': ' +
      (ok ? 'contains it, so the tick method holds.' : '!! DOES NOT - distrust the ticks.'));
  }
  const w = intersectBrackets(ticks.weekly);
  if (w && model) {
    const asRatio = x => (x / model.cap).toFixed(1) + 'x';
    if (w.contradiction) {
      console.log('\n  !! WEEKLY TICK BRACKETS CONTRADICT: at least ' + M(w.lo) +
        ' and at most ' + M(w.hi) + '.');
      console.log('  One interval holds usage this machine cannot see. Do not average them.');
    } else {
      console.log('\n  WEEKLY CAP from ' + w.n + ' tick bracket(s): ' +
        (w.lo ? M(w.lo) : 'unbounded below') + ' - ' +
        (w.hi != null ? M(w.hi) : 'unbounded above'));
      console.log('  = ' + (w.lo ? asRatio(w.lo) : '?') + ' - ' +
        (w.hi != null ? asRatio(w.hi) : '?') + ' the five-hour cap.' +
        (w.lo && w.lo / model.cap > HOURS_PER_WEEK / 5
          ? '\n  !! LOWER BOUND IS ABOVE THE 33.6x CEILING - wrong, not merely high.' : ''));
    }
  }
} else if (pairs.length) {
  console.log('\n  No tick brackets: no level was seen twice with its neighbours around it. A');
  console.log('  level pair cannot beat about +/-50%, because both ends are rounded. Read the');
  console.log('  bar every few minutes instead - two ticks bracket one point with no rounding.');
}
console.log('');
