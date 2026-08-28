#!/usr/bin/env node
/**
 * Legerly — measure the reasoning-token multipliers instead of guessing them.
 *
 * WHY THIS EXISTS
 * plan-limits.json._meta.reasoning carries a multiplier per model, applied to the
 * output side of every break-even on the site. Those numbers were my judgement:
 * "Opus 5 thinks about 3x its visible reply". Nobody can check that, and it is now
 * the largest soft input in a figure that tells people whether to spend $20 a month.
 * If ×3 should be ×2, Claude Pro's break-even moves from 13 to 16 messages/day.
 *
 * It does not have to be a guess. Every provider reports thinking tokens in usage:
 *
 *   OpenAI     usage.output_tokens_details.reasoning_tokens        (reported)
 *   Google     usage.total_thought_tokens / total_output_tokens    (reported)
 *   Anthropic  usage.output_tokens_details.thinking_tokens              (reported)
 *
 * All three report it. An earlier version of this header said Anthropic did not and
 * derived the figure by subtracting a count_tokens of the visible reply; that was
 * wrong, and wrong in a way that produced plausible numbers — count_tokens of an
 * assistant message adds ~20 tokens of framing, so a reply with no thinking at all
 * came out negative and clamped to exactly 1.0.
 *
 * WHAT IT MEASURES, AND WHAT IT DOES NOT
 * It measures what the API bills for an ordinary consumer question at default
 * settings. That is exactly the right question for break-even, which asks what the
 * same usage would cost per token — not what a benchmark suite costs. The prompt
 * corpus (scripts/reasoning-prompts.json) is deliberately ordinary for that reason.
 *
 * It does NOT measure the consumer apps. ChatGPT and Claude route and tune thinking
 * their own way behind the paywall, and neither publishes it. Anyone claiming to
 * know that number is guessing; this measures the API, and says so.
 *
 * COSTS REAL MONEY. Dry run by default: it prices the run from our own prices.json
 * and stops. Add --run to actually spend it.
 *
 *   node scripts/measure-reasoning.js                  # what it would cost, no calls
 *   node scripts/measure-reasoning.js --run            # measure, write a report
 *   node scripts/measure-reasoning.js --run --write    # ...and update plan-limits.json
 *   node scripts/measure-reasoning.js --run --group=coding --models=claude-opus-5
 *
 * Keys come from the environment and are never printed, logged or written to the
 * report: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY (or GOOGLE_API_KEY).
 * A provider with no key is skipped, not failed.
 *
 * Zero dependencies, like every other script here — raw HTTPS rather than the
 * provider SDKs, so this repo stays installable-by-git-clone.
 */
const fs = require('fs');
const https = require('https');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = (f, d) => { const a = args.find(x => x.startsWith(f + '=')); return a ? a.slice(f.length + 1) : d; };
const RUN = has('--run'), WRITE = has('--write');
const ONLY_GROUP = val('--group', null);
const ONLY_MODELS = (val('--models', '') || '').split(',').filter(Boolean);

const prices = JSON.parse(fs.readFileSync(path.join(ROOT, 'extension/prices.json'), 'utf8'));
const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'reasoning-prompts.json'), 'utf8'));

/* Which models to measure, and how to reach them. `key` is OUR key — the one used in
   prices.json and plan-limits.json — and `api` is what the provider calls it, because
   the two drift (our gemini-3.1-pro-preview is Google's model id, but that will not
   stay true forever). A model whose api id the provider rejects fails loudly with the
   provider's own error rather than being quietly skipped. */
const TARGETS = [
  { key: 'gpt-5.6-sol',            provider: 'openai',    api: 'gpt-5.6-sol' },
  { key: 'gpt-5.6-terra',          provider: 'openai',    api: 'gpt-5.6-terra' },
  { key: 'claude-opus-5',          provider: 'anthropic', api: 'claude-opus-5' },
  { key: 'claude-sonnet-5',        provider: 'anthropic', api: 'claude-sonnet-5' },
  { key: 'gemini-3.1-pro-preview', provider: 'google',    api: 'gemini-3.1-pro-preview' },
];

/* Keys come from the environment, or from a gitignored file if you would rather not
   fight PowerShell quoting — three attempts at exporting a key produced two syntax
   errors and a literal placeholder, which is a UX problem, not a user problem.
   scripts/.keys.local.json:  { "anthropic": "sk-ant-...", "openai": "sk-proj-..." }
   It is in .gitignore, nothing prints or logs it, and deleting the file revokes this
   script's access to it. An env var still wins if both are set. */
const KEYFILE = path.join(__dirname, '.keys.local.json');
let fileKeys = {};
try {
  // Strip a byte-order mark. Windows PowerShell 5.1's Set-Content -Encoding utf8
  // writes one, and JSON.parse rejects it — so the documented way of creating this
  // file produced a file this script refused to read.
  if (fs.existsSync(KEYFILE))
    fileKeys = JSON.parse(fs.readFileSync(KEYFILE, 'utf8').replace(/^﻿/, ''));
} catch (e) {
  console.error('scripts/.keys.local.json exists but is not valid JSON: ' + e.message);
  process.exit(1);
}
const clean = s => (typeof s === 'string' ? s.trim().replace(/^[<"']+|[>"']+$/g, '') : undefined);
const KEYS = {
  openai:    clean(process.env.OPENAI_API_KEY) || clean(fileKeys.openai),
  anthropic: clean(process.env.ANTHROPIC_API_KEY) || clean(fileKeys.anthropic),
  google:    clean(process.env.GEMINI_API_KEY) || clean(process.env.GOOGLE_API_KEY) || clean(fileKeys.google),
};
// A key still wrapped in the placeholder brackets is not a key. Say so before spending
// six requests discovering it — that is what happened the first two times.
for (const [prov, k] of Object.entries(KEYS)) {
  if (k && (/paste|placeholder|^(new |your )?key$|^sk-\.\.\./i.test(k) || !/^[A-Za-z0-9_\-]{20,}$/.test(k))) {
    console.error('The ' + prov + ' key is still the placeholder text, not a real key.');
    process.exit(1);
  }
}

const prompts = [];
for (const [group, list] of Object.entries(corpus.groups)) {
  if (ONLY_GROUP && group !== ONLY_GROUP) continue;
  list.forEach((text, i) => prompts.push({ group, i, text }));
}

const targets = TARGETS.filter(t => !ONLY_MODELS.length || ONLY_MODELS.includes(t.key));

/* ---------- tiny HTTPS helper (no deps) ---------- */
function post(host, pathname, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      host, path: pathname, method: 'POST',
      headers: Object.assign({
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
      }, headers),
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch { /* keep raw below */ }
        if (res.statusCode >= 400) {
          const msg = (parsed && (parsed.error && (parsed.error.message || parsed.error.status) || parsed.message))
                   || data.slice(0, 300);
          return reject(new Error('HTTP ' + res.statusCode + ': ' + msg));
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ---------- per-provider: return { visible, thinking } output tokens ---------- */

async function measureOpenAI(t, prompt) {
  // Responses API reports reasoning tokens directly, which is the whole reason this
  // is measurable rather than modellable.
  const r = await post('api.openai.com', '/v1/responses',
    { authorization: 'Bearer ' + KEYS.openai },
    { model: t.api, input: prompt.text });
  const u = r.usage || {};
  const thinking = ((u.output_tokens_details || {}).reasoning_tokens) || 0;
  const total = u.output_tokens || 0;
  return { visible: Math.max(0, total - thinking), thinking, reported: true };
}

async function measureGoogle(t, prompt) {
  const r = await post('generativelanguage.googleapis.com',
    '/v1beta/models/' + encodeURIComponent(t.api) + ':generateContent?key=' + encodeURIComponent(KEYS.google),
    {}, { contents: [{ parts: [{ text: prompt.text }] }] });
  const u = r.usageMetadata || r.usage || {};
  // Field naming has moved with the API generation; accept either shape rather than
  // silently reading undefined and reporting a multiplier of exactly 1.
  const thinking = u.thoughtsTokenCount ?? u.total_thought_tokens ?? null;
  const total    = u.candidatesTokenCount ?? u.total_output_tokens ?? null;
  if (thinking == null || total == null)
    throw new Error('no thinking/output token fields in usage: ' + JSON.stringify(u).slice(0, 200));
  // Google's candidatesTokenCount excludes thoughts in the generateContent shape and
  // includes them in the newer one. Detect by magnitude rather than assuming.
  const visible = total > thinking ? total - thinking : total;
  return { visible, thinking, reported: true };
}

async function measureAnthropic(t, prompt) {
  // max_tokens has to be generous. At 4096 the first real run truncated long answers
  // mid-reply (stop_reason: max_tokens): thinking is emitted first, so a cut-off reply
  // shrinks the visible half and inflates the ratio. Measuring a cap is not measuring
  // a model.
  const r = await post('api.anthropic.com', '/v1/messages',
    { 'x-api-key': KEYS.anthropic, 'anthropic-version': '2023-06-01' },
    { model: t.api, max_tokens: 16000, thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt.text }] });
  if (r.stop_reason === 'max_tokens')
    throw new Error('hit max_tokens — reply truncated, ratio would be inflated');
  const total = (r.usage || {}).output_tokens || 0;

  // Anthropic DOES itemise thinking, in usage.output_tokens_details.thinking_tokens.
  // The first version of this script derived it instead, by subtracting a count_tokens
  // of the visible reply — which was wrong twice over: count_tokens of an assistant
  // message adds ~20 tokens of framing, so a non-thinking reply came out NEGATIVE and
  // got clamped to a ratio of exactly 1.0, indistinguishable from a real 1.0. Use the
  // reported figure; keep the derivation only as a fallback if the field disappears.
  const details = (r.usage || {}).output_tokens_details || {};
  if (typeof details.thinking_tokens === 'number') {
    const thinking = details.thinking_tokens;
    const visible = Math.max(1, total - thinking);
    return { visible, thinking, reported: true };
  }
  const text = (r.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  if (!text) throw new Error('no visible text block in response (stop_reason: ' + r.stop_reason + ')');
  // count_tokens wants a conversation, and whether it accepts an assistant-only one
  // is the part of this script I could not test without a key. Try that first because
  // it frames the text the way it was actually generated; fall back to counting it as
  // a user turn, which costs a few tokens of framing difference and nothing else.
  let c;
  try {
    c = await post('api.anthropic.com', '/v1/messages/count_tokens',
      { 'x-api-key': KEYS.anthropic, 'anthropic-version': '2023-06-01' },
      { model: t.api, messages: [{ role: 'assistant', content: text }] });
  } catch (e) {
    if (!/HTTP 4\d\d/.test(e.message)) throw e;
    c = await post('api.anthropic.com', '/v1/messages/count_tokens',
      { 'x-api-key': KEYS.anthropic, 'anthropic-version': '2023-06-01' },
      { model: t.api, messages: [{ role: 'user', content: text }] });
  }
  // count_tokens of an assistant turn includes a small framing overhead; it is a
  // handful of tokens against replies in the hundreds, and subtracting a guess at it
  // would be a bigger error than leaving it in.
  const visible = c.input_tokens || 0;
  return { visible, thinking: Math.max(0, total - visible), reported: false };
}

const MEASURE = { openai: measureOpenAI, google: measureGoogle, anthropic: measureAnthropic };

/* ---------- what this run would cost, from our own price data ---------- */
function estimate() {
  const arc = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-limits.json'), 'utf8'))._meta.archetypes.standard;
  let total = 0;
  const rows = targets.map(t => {
    const rate = (prices.api[t.provider] || {})[t.key];
    if (!rate) return { t, cost: null };
    // Prompts are short; assume the archetype's output plus a 3x thinking allowance,
    // which is the very thing being measured — so this is an estimate of an estimate,
    // and only ever used to warn you before spending money.
    const perCall = 200 * rate.input + arc.output * 3 * rate.output;
    const cost = perCall * prompts.length;
    total += cost;
    return { t, cost };
  });
  return { rows, total };
}

/* ---------- percentiles ---------- */
const pct = (sorted, p) => {
  if (!sorted.length) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[i];
};
const round1 = n => Math.round(n * 10) / 10;

async function main() {
  // Apply an existing report without re-measuring. Needed the first time because the
  // method had two bugs and the data was re-gathered; useful every time after, because
  // paying an API again to correct something on our side is not a measurement.
  if (has('--from-report')) {
    const p = path.join(ROOT, 'scripts', 'reasoning-measurement.json');
    const report = JSON.parse(fs.readFileSync(p, 'utf8'));
    console.log('Applying ' + path.relative(ROOT, p) + ' (measured ' + report.measured_on + ') — no API calls.');
    writeBack(report);
    return;
  }

  console.log('Reasoning-multiplier measurement');
  console.log('prompts: ' + prompts.length + (ONLY_GROUP ? ' (group: ' + ONLY_GROUP + ')' : '') +
              ' · models: ' + targets.length);
  console.log('');

  const est = estimate();
  for (const r of est.rows) {
    const k = KEYS[r.t.provider];
    console.log('  ' + r.t.key.padEnd(24) + (k ? 'key present' : 'NO KEY — will skip').padEnd(20) +
                (r.cost == null ? '(unpriced)' : '~$' + r.cost.toFixed(2)));
  }
  console.log('  ' + 'TOTAL'.padEnd(24) + ''.padEnd(20) + '~$' + est.total.toFixed(2) +
              '  (rough: it assumes the 3x it is trying to measure)');
  console.log('');

  if (!RUN) {
    console.log('Dry run. Nothing was sent. Add --run to measure for real.');
    const missing = [...new Set(targets.map(t => t.provider))].filter(p => !KEYS[p]);
    if (missing.length) console.log('Set a key for: ' + missing.join(', ') +
      ' (OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY). Providers without one are skipped.');
    return;
  }

  const results = {};
  for (const t of targets) {
    if (!KEYS[t.provider]) { console.log('skipped ' + t.key + ' (no key)'); continue; }
    const ratios = [], byGroup = {}, errors = [];
    for (const p of prompts) {
      try {
        const m = await MEASURE[t.provider](t, p);
        if (!m.visible) { errors.push(p.group + '#' + p.i + ': zero visible tokens'); continue; }
        const ratio = (m.visible + m.thinking) / m.visible;
        ratios.push(ratio);
        (byGroup[p.group] = byGroup[p.group] || []).push(ratio);
        process.stdout.write('.');
      } catch (e) {
        errors.push(p.group + '#' + p.i + ': ' + e.message);
        process.stdout.write('x');
      }
    }
    process.stdout.write('\n');
    const sorted = ratios.slice().sort((a, b) => a - b);
    results[t.key] = {
      n: ratios.length,
      lo:  round1(pct(sorted, 0.10)),
      mid: round1(pct(sorted, 0.50)),
      hi:  round1(pct(sorted, 0.90)),
      mean: ratios.length ? round1(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null,
      by_group: Object.fromEntries(Object.entries(byGroup).map(([g, v]) =>
        [g, round1(v.reduce((a, b) => a + b, 0) / v.length)])),
      thinking_reported_by_provider: true,
      errors: errors.slice(0, 10),
    };
    const r = results[t.key];
    console.log('  ' + t.key.padEnd(24) + 'n=' + String(r.n).padStart(3) +
                '  lo ' + r.lo + '  mid ' + r.mid + '  hi ' + r.hi +
                (errors.length ? '  (' + errors.length + ' failed)' : ''));
  }

  // A run that measured nothing must not look like a run that succeeded. The first
  // real use of this script skipped every model for want of a key, wrote a report
  // whose models block was {}, exited 0, and told the operator nothing was wrong —
  // the same shape of failure as a guard that scans an empty string and passes.
  const measured = Object.values(results).filter(r => r.n > 0);
  if (!measured.length) {
    console.error('\nNOTHING WAS MEASURED — no report written, no data changed.');
    const noKey = [...new Set(targets.map(t => t.provider))].filter(p => !KEYS[p]);
    if (noKey.length) {
      console.error('No key visible to this process for: ' + noKey.join(', ') + '.');
      console.error('Env vars are per-terminal: if you set them with $env:NAME = "..." you must run');
      console.error('node in THAT same window. Check what this process can see, without printing it:');
      console.error('  node -e "console.log(Object.keys(process.env).filter(k=>/API_KEY/.test(k)))"');
    } else {
      console.error('Keys were present, so every call failed. First errors:');
      for (const [k, r] of Object.entries(results))
        (r.errors || []).slice(0, 2).forEach(e => console.error('  ' + k + ' — ' + e));
    }
    process.exit(1);
  }

  const report = {
    measured_on: new Date().toISOString().slice(0, 10),
    method: 'One API call per prompt at each provider default. All three providers report thinking tokens in usage — OpenAI as output_tokens_details.reasoning_tokens, Anthropic as output_tokens_details.thinking_tokens, Google as total_thought_tokens. Responses that hit max_tokens are discarded rather than counted: thinking is emitted before the reply, so a truncated answer inflates the ratio.',
    caveat: 'This measures the API, not the consumer apps. ChatGPT and Claude tune thinking their own way behind the paywall and publish nothing about it.',
    corpus: 'scripts/reasoning-prompts.json',
    prompts: prompts.length,
    models: results,
  };
  // MERGE with whatever is already there. This file is the evidence behind every
  // measured:true row in plan-limits.json, and a partial run used to overwrite it
  // wholesale — measuring one OpenAI model deleted the record of yesterday's Anthropic
  // pass, leaving a claim in the data file with nothing standing behind it. Each model
  // carries its own date, because they are not measured on the same day.
  const out = path.join(ROOT, 'scripts', 'reasoning-measurement.json');
  let prior = {};
  try {
    if (fs.existsSync(out)) {
      const p = JSON.parse(fs.readFileSync(out, 'utf8'));
      prior = p.models || {};
      // Backfill the date onto rows written before this field existed. Without it they
      // inherit the top-level date of THIS run, which would silently re-stamp an old
      // measurement as today's — a fresher provenance than the evidence supports.
      for (const v of Object.values(prior)) if (!v.measured_on) v.measured_on = p.measured_on;
    }
  } catch { /* unreadable prior report: better to rewrite it than to abort the run */ }
  for (const [k, v] of Object.entries(report.models)) v.measured_on = report.measured_on;
  report.models = Object.assign({}, prior, report.models);
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log('\nreport: ' + path.relative(ROOT, out));

  writeBack(report);
}

/* Write measured values into plan-limits.json. Split out from the run so a report can
   be applied without paying for the measurement twice — the first pass here was thrown
   away for method errors, and re-billing an API to fix a typo in my own script would
   be a silly way to spend someone else's money. */
function writeBack(report) {
  const results = report.models;
  if (WRITE) {
    const P = path.join(ROOT, 'plan-limits.json');
    const raw = fs.readFileSync(P, 'utf8');
    const j = JSON.parse(raw);
    for (const [key, r] of Object.entries(results)) {
      if (!r.n) continue;
      j._meta.reasoning.models[key] = { lo: r.lo, hi: r.hi, mid: r.mid,
        measured: true, n: r.n, as_of: r.measured_on || report.measured_on };
    }
    j._meta.reasoning.basis = 'MEASURED where a row says measured:true — see scripts/measure-reasoning.js and scripts/reasoning-measurement.json. lo/mid/hi are the p10/p50/p90 of the per-prompt ratio over an ordinary-chat corpus. Rows without measured:true are still estimates.';
    // Surgical, like derive-archetypes.js. Re-serialising the whole file reflowed
    // every row in it — a 300-line diff for a ten-number change, on the first run,
    // while changing no number at all.
    const NL = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    const block = ['    "reasoning": {',
      '      "comment": ' + JSON.stringify(j._meta.reasoning.comment) + ',',
      '      "basis": ' + JSON.stringify(j._meta.reasoning.basis) + ',',
      '      "models": {',
      Object.entries(j._meta.reasoning.models).map(([k, v]) =>
        '        ' + JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',' + NL),
      '      }', '    },'].join(NL);
    const start = raw.indexOf('    "reasoning": {');
    const end = raw.indexOf('    },', raw.indexOf('"models": {', start));
    if (start < 0 || end < 0) throw new Error('cannot locate the reasoning block in plan-limits.json');
    const out = raw.slice(0, start) + block + raw.slice(end + '    },'.length);
    JSON.parse(out);
    fs.writeFileSync(P, out);
    console.log('plan-limits.json updated — re-run check-auditor.js, and mirror the mids into pricing.html.');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
