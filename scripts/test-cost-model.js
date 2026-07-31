#!/usr/bin/env node
/**
 * EcoMeter AI — cost-model tests.
 *
 * These exist because two of the panel's numbers were badly wrong in ways that
 * reading the code did not reveal, and only checking against ground truth did:
 *
 *   - Billed input was charged at ~2x. estimateConversationReplay() accumulated a
 *     context snapshot after EVERY message, but a request happens once per USER
 *     turn; and the caller then added every user message a second time on top.
 *   - Claude image tokens were ~51x. The formula used 32px patches multiplied by
 *     65; Anthropic documents 28px patches at one token per patch, with a cap.
 *
 * Zero dependencies, consistent with the rest of the repo. Run:
 *   node scripts/test-cost-model.js
 * Exits non-zero on failure so it can gate CI.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../extension/sidepanel.js'), 'utf8');
function lift(name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) throw new Error('not found in sidepanel.js: ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
}
eval(lift('estimateBilledInput'));
eval(lift('estimateImageTokens'));
eval(lift('blendedInputRate'));
eval(lift('outputRateAt'));

let fail = 0;
const ok = (cond, label) => { if (!cond) { console.log('  FAIL ' + label); fail++; } else console.log('  ok   ' + label); };

// ── 1. Billed input matches ground truth ──────────────────
// input_k = sum_{j<k}(u_j + a_j) + u_k   for each user turn k
function truth(u, a) {
  let total = 0, prior = 0;
  for (let k = 0; k < u.length; k++) { total += prior + u[k]; prior += u[k] + (a[k] || 0); }
  return total;
}
function asMsgs(u, a) {
  const m = [];
  for (let i = 0; i < u.length; i++) {
    m.push({ tokens: u[i], role: 'user' });
    if (a[i] != null) m.push({ tokens: a[i], role: 'assistant' });
  }
  return m;
}
console.log('billed input vs ground truth:');
for (const [name, u, a] of [
  ['single turn',        [1000], [1000]],
  ['3 even turns',       [1000, 1000, 1000], [1000, 1000, 1000]],
  ['30 even turns',      Array(30).fill(1000), Array(30).fill(1000)],
  ['reply-heavy 1:4',    Array(10).fill(500), Array(10).fill(2000)],
  ['prompt-heavy 4:1',   Array(10).fill(2000), Array(10).fill(500)],
  ['big doc then chat',  [50000, 200, 200, 200], [800, 800, 800, 800]],
  ['unanswered last turn', [1000, 1000], [1000]],
]) {
  ok(estimateBilledInput(asMsgs(u, a)) === truth(u, a), name);
}
ok(estimateBilledInput([]) === 0, 'empty conversation costs nothing');
ok(estimateBilledInput([{ tokens: 500, role: 'assistant' }]) === 0, 'a reply alone triggers no request');

// ── 2. Claude image tokens match Anthropic's published table ──
// platform.claude.com/docs/en/docs/build-with-claude/vision
console.log('\nClaude image tokens vs Anthropic worked examples:');
for (const [w, h, std, hi] of [
  [200, 200, 64, 64],
  [1000, 1000, 1296, 1296],
  [1092, 1092, 1521, 1521],
  [1920, 1080, 1560, 2691],
  [2000, 1500, 1564, 3888],
  [3840, 2160, 1560, 4784],
]) {
  ok(estimateImageTokens({ width: w, height: h }, 'Claude', 'claude-sonnet-4-6') === std, w + 'x' + h + ' standard tier = ' + std);
  ok(estimateImageTokens({ width: w, height: h }, 'Claude', 'claude-opus-5') === hi, w + 'x' + h + ' high-res tier = ' + hi);
}
for (const [w, h] of [[8000, 8000], [10000, 200], [50, 50]]) {
  ok(estimateImageTokens({ width: w, height: h }, 'Claude', 'claude-sonnet-4-6') <= 1568 &&
     estimateImageTokens({ width: w, height: h }, 'Claude', 'claude-opus-5') <= 4784,
     'tier cap respected at ' + w + 'x' + h);
}

// ── 3. Long-context tier selection ────────────────────────
console.log('\nlong-context tier selection:');
const p = { input: 5e-6, output: 3e-5, long: { over: 272000, input: 1e-5, output: 4.5e-5 } };
const flat = { input: 5e-6, output: 3e-5 };
const conv = n => asMsgs(Array(n).fill(10000), Array(n).fill(10000));
ok(blendedInputRate(conv(50), flat, 2000) === flat.input, 'no long block -> base rate');
ok(blendedInputRate([], p, 2000) === p.input, 'empty conversation -> base rate');
ok(Math.abs(blendedInputRate(conv(3), p, 2000) - p.input) < 1e-15, 'short conversation stays on base rate');
ok(blendedInputRate(conv(400), p, 2000) > p.input * 1.9, 'very long conversation approaches long rate');
let mono = true, prev = 0;
for (let n = 1; n <= 200; n += 3) {
  const r = blendedInputRate(conv(n), p, 2000);
  if (r < prev - 1e-18 || r < p.input - 1e-18 || r > p.long.input + 1e-18) mono = false;
  prev = r;
}
ok(mono, 'blended rate rises monotonically, stays within [short, long]');
ok(outputRateAt(p, 100000) === p.output && outputRateAt(p, 300000) === p.long.output, 'output tier flips at the threshold');
ok(outputRateAt(flat, 9e9) === flat.output, 'output with no long block -> base rate');

// ── 4. Usage export (v2) ──────────────────────────────────
// accumulateUsage -> buildUsageExport, with just enough of the extension stubbed.
console.log('\nusage export v2:');
{
  let usageTrackingEnabled = true;
  let convState = {}, convOrder = [];
  let USAGE = { days: {} };
  const PROVIDER_OF = { Claude: 'anthropic', ChatGPT: 'openai' };
  const usageTodayStr = () => '2026-07-29';
  const usageHash = (r, t) => r + ':' + t.length + ':' + t.slice(0, 12);
  const scheduleUsageSave = () => {};
  eval(lift('accumulateUsage'));
  eval(lift('buildUsageExport'));

  const convo = [];
  for (let i = 0; i < 5; i++) {
    convo.push({ counted: true, tokens: 1000, role: 'user', text: 'user message ' + i });
    convo.push({ counted: true, tokens: 1000, role: 'assistant', text: 'reply ' + i });
  }
  // Feed it the way polling actually sees it: growing, repeatedly.
  for (let t = 1; t <= 5; t++) accumulateUsage(convo.slice(0, t * 2), 'Claude', 'claude-opus-5');

  const truthBilled = (() => { let prior = 0, tot = 0; for (let k = 0; k < 5; k++) { tot += prior + 1000; prior += 2000; } return tot; })();
  const p = buildUsageExport().platforms[0];

  ok(buildUsageExport().version === 2, 'export declares version 2');
  ok(p.input_tokens_per_day === 5000, 'visible input unchanged by the v2 addition');
  ok(p.billed_input_tokens_per_day === truthBilled, 'billed input matches ground truth (' + truthBilled + ')');
  ok(p.billed_input_tokens_per_day === 5 * p.input_tokens_per_day, 'billed is 5x visible on a 5-turn chat');
  ok(p.user_turns_per_day === 5 && p.messages_per_day === 10, 'user turns tracked separately from messages');
  ok(p.model_usage[0].billed_input_tokens_per_day === truthBilled, 'per-model billed split present');

  const before = JSON.stringify(buildUsageExport());
  accumulateUsage(convo, 'Claude', 'claude-opus-5');
  ok(JSON.stringify(buildUsageExport()) === before, 're-polling identical state adds nothing');

  // Days recorded before v2 carry no billed keys and must not dilute the average.
  USAGE.days['2026-07-01'] = { anthropic: { msgs: 10, inTok: 5000, outTok: 5000, byModel: {} } };
  const e2 = buildUsageExport().platforms[0];
  ok(e2.billed_days === 1, 'pre-v2 day excluded from billed_days');
  ok(e2.billed_input_tokens_per_day === truthBilled, 'pre-v2 day does not drag the billed average down');
  ok(e2.active_days === 2, 'pre-v2 day still counts toward active_days');

  USAGE.days['2026-07-01'].openai = { msgs: 4, inTok: 2000, outTok: 2000, byModel: {} };
  const oa = buildUsageExport().platforms.find(x => x.provider === 'openai');
  ok(oa && oa.billed_input_tokens_per_day === undefined, 'no billed data -> field omitted, never zeroed');
}

console.log(fail ? '\n' + fail + ' FAILURE(S)' : '\nall cost-model tests pass');
process.exit(fail ? 1 : 0);
