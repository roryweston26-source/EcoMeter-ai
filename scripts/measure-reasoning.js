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
 * It does not have to be a guess. Two of the three providers report thinking tokens
 * directly, and the third can be derived:
 *
 *   OpenAI     usage.output_tokens_details.reasoning_tokens        (reported)
 *   Google     usage.total_thought_tokens / total_output_tokens    (reported)
 *   Anthropic  not reported — thinking is billed inside output_tokens and the raw
 *              chain of thought is never returned. So: multiplier = output_tokens
 *              ÷ tokens(visible reply), with the visible reply counted by
 *              /v1/messages/count_tokens. One extra call, and count_tokens is free.
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

const KEYS = {
  openai:    process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  google:    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
};

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
  // Thinking is billed inside output_tokens and never itemised, so the visible half
  // has to be counted separately. count_tokens is free and exact — much better than
  // estimating the reply length with a char ratio.
  const r = await post('api.anthropic.com', '/v1/messages',
    { 'x-api-key': KEYS.anthropic, 'anthropic-version': '2023-06-01' },
    { model: t.api, max_tokens: 4096, thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt.text }] });
  const total = (r.usage || {}).output_tokens || 0;
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
      thinking_reported_by_provider: t.provider !== 'anthropic',
      errors: errors.slice(0, 10),
    };
    const r = results[t.key];
    console.log('  ' + t.key.padEnd(24) + 'n=' + String(r.n).padStart(3) +
                '  lo ' + r.lo + '  mid ' + r.mid + '  hi ' + r.hi +
                (errors.length ? '  (' + errors.length + ' failed)' : ''));
  }

  const report = {
    measured_on: new Date().toISOString().slice(0, 10),
    method: 'One API call per prompt at each provider default. OpenAI and Google report thinking tokens; Anthropic does not, so its ratio is output_tokens divided by count_tokens of the visible reply.',
    caveat: 'This measures the API, not the consumer apps. ChatGPT and Claude tune thinking their own way behind the paywall and publish nothing about it.',
    corpus: 'scripts/reasoning-prompts.json',
    prompts: prompts.length,
    models: results,
  };
  const out = path.join(ROOT, 'scripts', 'reasoning-measurement.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log('\nreport: ' + path.relative(ROOT, out));

  if (WRITE) {
    const P = path.join(ROOT, 'plan-limits.json');
    const raw = fs.readFileSync(P, 'utf8');
    const j = JSON.parse(raw);
    for (const [key, r] of Object.entries(results)) {
      if (!r.n) continue;
      j._meta.reasoning.models[key] = { lo: r.lo, hi: r.hi, mid: r.mid,
        measured: true, n: r.n, as_of: report.measured_on };
    }
    j._meta.reasoning.basis = 'MEASURED where a row says measured:true — see scripts/measure-reasoning.js and scripts/reasoning-measurement.json. lo/mid/hi are the p10/p50/p90 of the per-prompt ratio over an ordinary-chat corpus. Rows without measured:true are still estimates.';
    const NL = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
    fs.writeFileSync(P, JSON.stringify(j, null, 2).split('\n').join(NL) + NL);
    console.log('plan-limits.json updated — re-run check-auditor.js, and mirror the mids into pricing.html.');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
