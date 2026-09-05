#!/usr/bin/env node
/**
 * Legerly — turn a pasted Claude Code usage report into a reading, and say straight
 * away whether it is worth having.
 *
 * The usage popover has a copy icon that emits this:
 *
 *   Plan limits:
 *   - session-0: 4% (resets 2026-09-03T02:50:00.618709+00:00)
 *   - weekly_all-1: 8% (resets 2026-09-05T06:00:00.618731+00:00)
 *   Local activity: 72 requests (24h) | 2138 (7d)
 *
 * WHY A PARSER RATHER THAN TYPING IT IN. The tick protocol wants a reading every few
 * minutes, and hand-copying percentages into JSON dozens of times is precisely how a
 * wrong number enters a dataset that is then defended as measured. This also keeps the
 * EXACT reset instants, which the human-readable label ("Sat 2:00 AM") throws away —
 * and only the exact form detects a reset that lands on a number the bar already showed.
 *
 * IT ALSO CHECKS THE READING WHILE IT IS STILL CHEAP TO FIX. On this account the meter
 * is also fed by claude.ai and the phone (see MEASURE-CLAUDE-LIMITS.md, scope), and
 * usage from there is invisible to the transcripts. That shows up as the bar climbing
 * while this machine was quiet — so every append prints what the last interval implies,
 * and says so if it implies something impossible. Finding that out during the run is
 * worth far more than finding it out afterwards.
 *
 * Usage:
 *   node scripts/parse-usage-report.js --into readings.json --file paste.txt
 *   node scripts/parse-usage-report.js --into readings.json          # reads stdin
 *   node scripts/parse-usage-report.js --into readings.json --list   # show what we have
 *
 * The timestamp is the moment this runs, not a field in the report — the report does
 * not carry one. At a three-minute cadence the few seconds between copying and pasting
 * do not matter; at a ten-second cadence they would.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const argVal = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const into = argVal('--into');
const fromFile = argVal('--file');
const projectsDir = argVal('--projects') || path.join(os.homedir(), '.claude', 'projects');

if (!into) {
  console.error('Need --into <readings.json>');
  process.exit(1);
}

const readings = fs.existsSync(into) ? JSON.parse(fs.readFileSync(into, 'utf8')) : [];

if (args.includes('--list')) {
  console.log('\n' + readings.length + ' reading(s) in ' + into);
  for (const r of readings) {
    console.log('  ' + r.ts + '   5h ' + String(r.fiveHourPct + '%').padStart(4) +
      '   weekly ' + String(r.weeklyPct + '%').padStart(4) +
      (r.weeklyReset ? '   resets ' + r.weeklyReset : ''));
  }
  process.exit(0);
}

// ---------------------------------------------------------------- parse
const text = fromFile ? fs.readFileSync(fromFile, 'utf8') : fs.readFileSync(0, 'utf8');

// "- weekly_all-1: 8% (resets 2026-09-05T06:00:00.618731+00:00)". The trailing index is
// the meter's position in a LIST, so a plan with a third meter would print a third line
// here rather than needing a screenshot to interpret. Capture whatever turns up.
const meters = [];
const re = /^\s*[-*]?\s*([a-z_]+)-(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*%\s*(?:\(resets\s+([^)]+)\))?/gim;
let m;
while ((m = re.exec(text)) !== null) {
  meters.push({ name: m[1], index: Number(m[2]), pct: Number(m[3]), resets: m[4] ? m[4].trim() : null });
}
if (!meters.length) {
  console.error('No "meter-N: P%" lines found. Paste the whole copy-button output, not a screenshot.');
  process.exit(1);
}

const iso = s => {
  if (!s) return null;
  const t = Date.parse(s);
  return isNaN(t) ? s.trim() : new Date(t).toISOString();
};
const pick = n => meters.find(x => x.name === n) || null;
const session = pick('session');
const weekly = pick('weekly_all');
const others = meters.filter(x => x !== session && x !== weekly);

const activity = /Local activity:\s*(\d+)\s*requests?\s*\(24h\)\s*\|\s*(\d+)\s*\(7d\)/i.exec(text);
const client = /\b(\d+\.\d+\.\d+)\b/.exec(text);

const reading = {
  ts: new Date().toISOString(),
  fiveHourPct: session ? session.pct : null,
  fiveHourReset: session ? iso(session.resets) : null,
  weeklyPct: weekly ? weekly.pct : null,
  weeklyReset: weekly ? iso(weekly.resets) : null,
};
if (client) reading.client = client[1];
if (activity) reading.localRequests = { h24: Number(activity[1]), d7: Number(activity[2]) };
if (others.length) reading.otherMeters = others;

if (reading.weeklyPct === null) {
  console.error('No weekly_all meter in that paste — nothing to add to the weekly run.');
  process.exit(1);
}

// ---------------------------------------------------------------- append
const last = readings[readings.length - 1];
if (last && last.ts >= reading.ts) {
  console.error('Timestamps must increase; last is ' + last.ts);
  process.exit(1);
}
readings.push(reading);
fs.writeFileSync(into, JSON.stringify(readings, null, 2) + '\n');

console.log('\nreading ' + readings.length + ' recorded at ' + reading.ts);
console.log('  five-hour ' + String(reading.fiveHourPct + '%').padStart(4) +
  (reading.fiveHourReset ? '  resets ' + reading.fiveHourReset : '  (window closed - no reset printed)'));
console.log('  weekly    ' + String(reading.weeklyPct + '%').padStart(4) +
  (reading.weeklyReset ? '  resets ' + reading.weeklyReset : ''));

// A third meter would be a genuine discovery: "Weekly - all models" implies a sibling
// scoped to a subset, most plausibly a separate budget for the priciest model, and no
// Pro reading has ever shown one.
if (others.length) {
  console.log('\n  ** A METER WE HAVE NEVER SEEN ON THIS PLAN **');
  for (const o of others) console.log('     ' + o.name + '-' + o.index + ': ' + o.pct + '%' +
    (o.resets ? ' (resets ' + iso(o.resets) + ')' : ''));
  console.log('     Record this before doing anything else - it changes what the plan IS.');
}

// ---------------------------------------------------------------- sanity, live
if (!last) {
  console.log('\n  First reading of the run. The next one starts bracketing.');
  process.exit(0);
}

if (reading.weeklyReset && last.weeklyReset && reading.weeklyReset !== last.weeklyReset) {
  console.log('\n  !! The weekly reset instant CHANGED (' + last.weeklyReset + ' -> ' +
    reading.weeklyReset + ').');
  console.log('     A new window has begun; readings either side of it are not comparable.');
  process.exit(0);
}

const M = require('./measure-claude-limits.js');
const { requests } = M.load(projectsDir);
const t0 = Date.parse(last.ts), t1 = Date.parse(reading.ts);
const span = requests.filter(r => { const t = Date.parse(r.ts); return t > t0 && t <= t1; });
const units = M.unitsOf(M.totalsOf(span), 0, 7.75);
const dw = reading.weeklyPct - last.weeklyPct;
const mins = (t1 - t0) / 60000;

console.log('\n  since the last reading: ' + mins.toFixed(1) + ' min, ' + span.length +
  ' requests, ' + (units / 1e6).toFixed(3) + 'M units, weekly ' + (dw >= 0 ? '+' : '') + dw + 'pp');

if (dw === 0) {
  console.log('  Bar unchanged - which is EVIDENCE, not a wasted glance. It is what pins the');
  console.log('  lower end of the bracket for this level. Keep going.');
} else if (dw < 0) {
  console.log('  !! The bar FELL. Either the window reset, or a reading is wrong.');
} else {
  const impliedCap = units / (dw / 100);
  const FIVE_HOUR = 3.09e6;
  console.log('  a ' + dw + 'pp move on ' + (units / 1e6).toFixed(3) + 'M implies a cap of ' +
    (impliedCap / 1e6).toFixed(1) + 'M = ' + (impliedCap / FIVE_HOUR).toFixed(1) +
    'x the five-hour cap');
  if (span.length === 0) {
    console.log('  !! THE BAR MOVED WHILE THIS MACHINE SENT NOTHING. That is claude.ai or the');
    console.log('     phone. Stop using them, and treat this interval as unusable.');
  } else if (impliedCap / FIVE_HOUR < 6) {
    console.log('  !! Far below every clean reading on record (13.3x). Off-machine usage biases');
    console.log('     this DOWNWARD, so the likeliest explanation is the browser or the phone.');
  } else if (impliedCap / FIVE_HOUR > 168 / 5) {
    console.log('  !! ABOVE the 33.6x arithmetic ceiling - impossible, so something is wrong.');
  }
}
console.log('\n  node scripts/measure-claude-limits.js --readings ' + into + '   for the brackets');
