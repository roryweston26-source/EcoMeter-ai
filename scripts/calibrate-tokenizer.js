#!/usr/bin/env node
/**
 * EcoMeter AI — tokenizer estimator calibration.
 *
 * WHY THIS EXISTS
 * sidepanel.js has carried a claim since 2026 that the char-ratio estimator was
 * "recalibrated against real tiktoken on a mixed prose/code/URL corpus" from
 * ~32% MAE to ~8%, and METHOD_ACCURACY surfaces that 8% to users as an "±8%
 * token estimate" band. No script, corpus or fixture backed it up, so the number
 * could not be checked or reproduced — while being shown to users as a measured
 * accuracy. For a project whose whole pitch is "we label our estimates", an
 * unverifiable accuracy claim is the wrong kind of debt.
 *
 * WHAT IT DOES
 * Runs the estimators lifted straight out of sidepanel.js against the bundled
 * real tiktoken (cl100k), over a corpus built deterministically from this repo's
 * own text, and reports MAE, mean bias and p95 error per content type.
 *
 * cl100k is ground truth for the char-ratio estimator specifically: that path is
 * the fallback for models whose tokenizer we cannot run, and cl100k is the proxy
 * the extension already uses for them. It is NOT ground truth for the Gemini
 * SentencePiece path — that one is reported for reference only and is labelled
 * as unvalidated, because we have no Gemma tokenizer bundled to check it against.
 *
 * Run:  node scripts/calibrate-tokenizer.js
 * Exits non-zero if measured MAE contradicts the band in METHOD_ACCURACY.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// ── real tiktoken (ground truth) ──────────────────────────
eval(fs.readFileSync(path.join(ROOT, 'extension/tokenizer_cl100k.js'), 'utf8'));
const truth = t => cl100k.encode(t).length;

// ── estimators, lifted from sidepanel.js so they cannot drift ──
const src = fs.readFileSync(path.join(ROOT, 'extension/sidepanel.js'), 'utf8');
function lift(name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) throw new Error('not found: ' + name);
  let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') d++;
    if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
}
for (const fn of ['charRatioEstimate', '_estimateProse', 'sentencePieceEstimate', '_estimateSPProse']) {
  eval(lift(fn));
}
const METHOD_ACCURACY = eval('(' + src.slice(src.indexOf('const METHOD_ACCURACY = {') + 'const METHOD_ACCURACY = '.length,
  src.indexOf('};', src.indexOf('const METHOD_ACCURACY = {')) + 1) + ')');

// ── corpus, built from this repo's own text ───────────────
// Real text, no fabricated samples, fully reproducible from a checkout. Chunked
// so each sample is roughly a chat message rather than a whole file — the
// estimator is applied per message in the extension, and error does not scale
// linearly with length.
function chunk(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    const s = text.slice(i, i + size).trim();
    if (s.length > 200) out.push(s);
  }
  return out;
}
const read = p => { try { return fs.readFileSync(path.join(ROOT, p), 'utf8'); } catch { return ''; } };

const prose = [
  ...chunk(read('PROJECT-CONTEXT.md').replace(/```[\s\S]*?```/g, ''), 1200),
  ...chunk(read('CLAUDE.md'), 1200),
  ...chunk(read('README.md'), 1200),
  ...chunk(read('extension/STORE-LISTING.md'), 1200),
];
const code = [
  ...chunk(read('extension/sidepanel.js').slice(0, 120000), 1500),
  ...chunk(read('scripts/update-prices.js'), 1500),
  ...chunk(read('scripts/check-prices.js'), 1500),
];
// Markdown with fenced code — exercises the code-fence branch specifically.
const fenced = chunk(read('PROJECT-CONTEXT.md'), 2500).filter(s => s.includes('```'));
// URL-dense text — exercises the URL branch.
const urls = (() => {
  const all = (read('datacenters.json') + read('plan-limits.json') + read('transparency-index.json'))
    .match(/https?:\/\/[^\s"'<>)]+/g) || [];
  const out = [];
  for (let i = 0; i < all.length; i += 8) {
    const s = all.slice(i, i + 8).join('\n');
    if (s.length > 200) out.push(s);
  }
  return out;
})();

const SETS = [
  ['prose',        prose,  'charRatio'],
  ['code',         code,   'charRatio'],
  ['fenced md',    fenced, 'charRatio'],
  ['URL-dense',    urls,   'charRatio'],
];

function measure(samples, estimator) {
  const errs = [];
  let signed = 0;
  for (const s of samples) {
    const t = truth(s);
    if (t < 20) continue;                 // too short to be meaningful
    const e = estimator(s);
    errs.push(Math.abs(e - t) / t);
    signed += (e - t) / t;
  }
  errs.sort((a, b) => a - b);
  return {
    n: errs.length,
    mae: errs.reduce((a, b) => a + b, 0) / (errs.length || 1),
    bias: signed / (errs.length || 1),
    p95: errs[Math.floor(errs.length * 0.95)] || 0,
    worst: errs[errs.length - 1] || 0,
  };
}

const pct = x => (x * 100).toFixed(1) + '%';
const sgn = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';

console.log('Corpus built from this repo. cl100k = ground truth.\n');
console.log('set            n      MAE     bias      p95    worst');
console.log('-'.repeat(56));

const all = [];
for (const [name, samples, kind] of SETS) {
  if (!samples.length) { console.log(name.padEnd(14) + '  (no samples)'); continue; }
  const r = measure(samples, charRatioEstimate);
  all.push(...samples);
  console.log(
    name.padEnd(14) + String(r.n).padStart(4) + pct(r.mae).padStart(9) +
    sgn(r.bias).padStart(9) + pct(r.p95).padStart(9) + pct(r.worst).padStart(9)
  );
}
const overall = measure(all, charRatioEstimate);
console.log('-'.repeat(56));
console.log(
  'OVERALL'.padEnd(14) + String(overall.n).padStart(4) + pct(overall.mae).padStart(9) +
  sgn(overall.bias).padStart(9) + pct(overall.p95).padStart(9) + pct(overall.worst).padStart(9)
);

// SentencePiece path — reported, not validated. We have no Gemma tokenizer
// bundled, so comparing it to cl100k measures the gap between two different
// tokenizers, not the estimator's accuracy. Shown so the number is not invisible.
const sp = measure(all, sentencePieceEstimate);
console.log('\nGemini SentencePiece estimator vs cl100k (NOT ground truth for it —');
console.log('reference only; needs a bundled Gemma tokenizer to validate):');
console.log('  divergence from cl100k: ' + pct(sp.mae) + ' MAE, ' + sgn(sp.bias) + ' bias');

// ── verdict against the band we show users ────────────────
const claimed = METHOD_ACCURACY['estimated'].err;
console.log('\nMETHOD_ACCURACY.estimated claims ±' + (claimed * 100).toFixed(0) + '%; measured MAE is ' + pct(overall.mae) + '.');
const understated = overall.mae > claimed * 1.25;
if (understated) {
  console.log('FAIL — the band shown to users is optimistic against this corpus.');
  console.log('       Either widen METHOD_ACCURACY.estimated or improve the estimator.');
} else {
  console.log('OK — the advertised band is not optimistic against this corpus.');
}
process.exit(understated ? 1 : 0);
