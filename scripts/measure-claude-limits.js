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
 * SCOPE, AND IT IS THE LOAD-BEARING CAVEAT: this reads one machine's Claude Code
 * transcripts. Any use of claude.ai, mobile, or a second machine on the same
 * account counts against the same meters and is invisible here, which biases every
 * cap DOWNWARD. Claude Code's own panel says the same of itself ("this machine
 * only, excludes claude.ai"). Only quote these figures for an account whose owner
 * confirms Claude Code on one machine is all they use.
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
        rejections.push({ ts: o.timestamp, type: o.quotaLimits.rateLimitType, resetsAt: o.quotaLimits.resetsAt });
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
function fiveHourWindows(requests, rejections) {
  const seen = new Set();
  const out = [];
  const rs = rejections
    .filter(r => r.type === 'five_hour' || !r.type)
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
const cv = v => {
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)) / m;
};
const unitsOf = (t, a, b) => t.input + t.cacheWrite + a * t.cacheRead + b * t.output;

function fit(windows) {
  if (windows.length < 2) return null;
  let best = null;
  for (let a = 0; a <= 1.0001; a += 0.01) {
    for (let b = 0; b <= 40; b += 0.25) {
      const c = cv(windows.map(w => unitsOf(w.totals, a, b)));
      if (!best || c < best.cv) best = { alpha: +a.toFixed(2), beta: +b.toFixed(2), cv: c };
    }
  }
  // How wide is beta? Anything within 1.2x of the minimum is not distinguishable here.
  const band = [];
  for (let b = 0; b <= 40; b += 0.05) {
    if (cv(windows.map(w => unitsOf(w.totals, best.alpha, b))) <= best.cv * 1.2) band.push(b);
  }
  const values = windows.map(w => unitsOf(w.totals, best.alpha, best.beta));
  best.betaRange = band.length ? [+band[0].toFixed(2), +band[band.length - 1].toFixed(2)] : null;
  best.cap = values.reduce((a, b) => a + b, 0) / values.length;
  best.values = values;
  best.spread = Math.max(...values) / Math.min(...values);
  // If the best alpha sits at 0, say how much worse a billing-weight cache read
  // would be. That comparison IS the finding, so it must not be left implicit --
  // and it re-optimises beta, because holding beta fixed would flatter us.
  let alt = Infinity;
  for (let b = 0; b <= 40; b += 0.25) alt = Math.min(alt, cv(windows.map(w => unitsOf(w.totals, CACHE.read, b))));
  best.cvAtBillingCacheRead = alt;
  return best;
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

function pairReadings(readings, requests, model) {
  const out = [];
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1], b = readings[i];
    const t0 = Date.parse(a.ts), t1 = Date.parse(b.ts);
    if (!(t1 > t0)) continue;
    const span = requests.filter(r => { const t = Date.parse(r.ts); return t > t0 && t <= t1; });
    if (!span.length) continue;
    const t = totalsOf(span);
    const units = unitsOf(t, model.alpha, model.beta);
    const d5 = b.fiveHourPct - a.fiveHourPct;
    const dw = b.weeklyPct - a.weeklyPct;
    out.push({
      from: a.ts, to: b.ts, n: span.length, units, cost: t.cost, d5, dw,
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

// ---------------------------------------------------------------- report
const { requests, rejections, lines, blockDupes } = load(projectsDir);
if (!requests.length) {
  console.error('No transcripts found under ' + projectsDir);
  process.exit(1);
}

const all = totalsOf(requests);
const windows = fiveHourWindows(requests, rejections);
const clean = windows.filter(w => w.unseenMin < MAX_UNSEEN_MIN);
const model = fit(clean.length >= 2 ? clean : windows);

const readings = readingsFile ? JSON.parse(fs.readFileSync(readingsFile, 'utf8')) : [];
const pairs = model ? pairReadings(readings, requests, model) : [];

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
      unit: `input + cache_write + ${model.alpha} * cache_read + ${model.beta} * output`,
      cacheReadWeight: model.alpha, outputWeight: model.beta, outputWeightRange: model.betaRange,
      fiveHourCapUnits: model.cap, cv: model.cv, spread: model.spread,
      cvIfCacheReadAtBillingWeight: model.cvAtBillingCacheRead,
      n: (clean.length >= 2 ? clean : windows).length,
    },
    weekly: { arithmeticCeilingRatio: HOURS_PER_WEEK / 5, pairs },
  }, null, 2));
  process.exit(0);
}

const M = x => (x / 1e6).toFixed(2) + 'M';
const K = x => (x / 1e3).toFixed(0) + 'k';

console.log('\nCLAUDE USAGE LIMITS - measured from Claude Code transcripts');
console.log('  Claude Code on this machine only; excludes claude.ai and any other device.');
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
    (w.unseenMin >= MAX_UNSEEN_MIN ? '   <- contaminated, excluded' : ''));
}

if (model) {
  const n = (clean.length >= 2 ? clean : windows).length;
  const opus = rate('claude-opus-5');
  console.log(`\n  Best-fitting unit (n=${n}): input + cache_write + ${model.alpha} * cache_read + ${model.beta} * output`);
  console.log(`  Cache reads weigh ${model.alpha} against the limit; at their BILLING weight (${CACHE.read}) the fit`);
  console.log(`  degrades from ${(model.cv * 100).toFixed(1)}% to ${(model.cvAtBillingCacheRead * 100).toFixed(1)}% CV. Re-sent context is close to free here.`);
  console.log(`  Output weight ${model.beta}` +
    (model.betaRange ? ` (indistinguishable over ${model.betaRange[0]}-${model.betaRange[1]})` : '') +
    ` against ${(opus.output / opus.input).toFixed(0)}x on the price list.`);
  console.log(`  FIVE-HOUR CAP = ${M(model.cap)} units  (spread ${model.spread.toFixed(2)}x, CV ${(model.cv * 100).toFixed(1)}%)`);
  console.log(`  The same windows in dollars: $${Math.min(...windows.map(w => w.totals.cost)).toFixed(0)}-` +
    `$${Math.max(...windows.map(w => w.totals.cost)).toFixed(0)} - wide, because the limit is not the bill.`);
}

console.log('\nWEEKLY WINDOW');
console.log(`  Arithmetic ceiling on weekly/five-hour: ${(HOURS_PER_WEEK / 5).toFixed(1)}x - only that many`);
console.log('  five-hour windows fit in a week. An estimate above it is wrong, not merely high.');
if (!pairs.length) {
  console.log('  No panel readings supplied. Pass --readings <file.json>:');
  console.log('    [{"ts":"2026-09-02T16:26:35Z","fiveHourPct":17,"weeklyPct":4,"weeklyReset":"Sat 2:00 AM"}]');
} else {
  console.log('  from  -> to      reqs     units    d5h    dwk     5h cap    weekly cap (ratio)');
  for (const p of pairs) {
    const ratio = p.weeklyCap && model ? (p.weeklyCap / model.cap).toFixed(1) + 'x' : '-';
    console.log('  ' + p.from.slice(11, 16) + ' -> ' + p.to.slice(11, 16) +
      String(p.n).padStart(6) + M(p.units).padStart(10) +
      String(p.d5 + 'pp').padStart(7) + String(p.dw + 'pp').padStart(7) +
      (p.fiveHourCap ? M(p.fiveHourCap) : '-').padStart(11) +
      '   ' + (p.weeklyCap ? M(p.weeklyCap) : '-') + ' (' + ratio + ')' +
      (p.reset ? '   <- window reset between readings, ratio meaningless' : ''));
  }
  const usable = pairs.filter(p => p.weeklyCap && !p.reset && model);
  if (usable.length) {
    const rs = usable.map(p => p.weeklyCap / model.cap);
    console.log(`\n  weekly/five-hour from ${usable.length} pair(s): ` +
      `${Math.min(...rs).toFixed(1)}x - ${Math.max(...rs).toFixed(1)}x` +
      (rs.some(r => r > HOURS_PER_WEEK / 5)
        ? '\n  !! ABOVE THE CEILING - a window reset, or the two meters count different things'
        : ''));
  }
  console.log('\n  A one-point move on the weekly bar carries +/-1 point of rounding, so a single');
  console.log('  pair cannot beat about +/-50%. Catch the bar TICKING instead: between two');
  console.log('  consecutive ticks exactly one point of the cap is spent, and the usage between');
  console.log('  them is exact here. Ticks, not levels.');
}
console.log('');
