#!/usr/bin/env node
/*
 * check-transparency.js — the part of the Transparency Index that is still live.
 *
 * The Index page was retired on 2026-11-12 (transparency-index.html is now a short
 * notice). One axis survives: the Subscription Auditor's privacy answer reads the
 * data_practices rows of transparency-index.json and tells a reader whether each
 * provider states its training default and documents an opt-out, linking each point
 * to the provider page it was read from. A file nothing checks is a file that is
 * wrong (FRESHNESS rule 9), so this checks what the Auditor can show:
 *
 *   1. Every data_practices cell is graded, explained and sourced, and the two
 *      columns the Auditor reads are https links (they render as clickable links).
 *   2. Every provider the Auditor maps to a row (PRACTICE_ROW) has one.
 *   3. No live page links to a retired page.
 *   4. Soft: the grades go stale. Warn once last_verified is over 120 days old.
 *
 * The environmental and pricing axes and datacenters.json went with the page, and so
 * did the checks that guarded them (coverage counts, doc tables, maintainer-speak).
 *
 * Run: node scripts/check-transparency.js   (exits non-zero on failure; in CI)
 */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..') + path.sep;
const errors = [], warnings = [];
const fail = m => errors.push(m), warn = m => warnings.push(m);

let TI;
try { TI = JSON.parse(fs.readFileSync(R + 'transparency-index.json', 'utf8')); }
catch (e) { console.error('  ✗ transparency-index.json could not be parsed: ' + e.message); process.exit(1); }

const DP = TI.data_practices;
const GRADES = ['green', 'yellow', 'red', 'pending'];
const AUDITOR_COLUMNS = ['training_default', 'optout'];

// 1. Cells
let cells = 0;
if (!DP || !Array.isArray(DP.columns) || !Array.isArray(DP.rows) || !DP.rows.length) {
  fail('transparency-index.json has no data_practices columns/rows for the Auditor to read');
} else {
  const keys = DP.columns.map(c => c.key);
  for (const k of AUDITOR_COLUMNS)
    if (!keys.includes(k)) fail(`data_practices has no "${k}" column, and the Auditor's privacy answer reads it`);
  for (const row of DP.rows) {
    if (!row.provider) { fail('a data_practices row has no provider name'); continue; }
    if (!row.cells) { fail(`${row.provider}: no cells`); continue; }
    for (const k of keys) {
      const c = row.cells[k];
      if (!c) { fail(`${row.provider}/${k}: missing cell`); continue; }
      cells++;
      if (!GRADES.includes(c.grade)) fail(`${row.provider}/${k}: invalid grade "${c.grade}"`);
      if (!c.note || !String(c.note).trim()) fail(`${row.provider}/${k}: no note, and an unexplained grade is not a finding`);
      const u = c.source_url || '';
      if (!/^https?:\/\//.test(u)) fail(`${row.provider}/${k}: no source_url`);
      else if (AUDITOR_COLUMNS.includes(k) && !/^https:\/\//.test(u))
        fail(`${row.provider}/${k}: source_url must be https, because the Auditor renders it as a link and drops anything else`);
    }
  }
}

// 2. Every provider the Auditor maps has a row
const audit = fs.readFileSync(R + 'audit.html', 'utf8');
const m = audit.match(/const PRACTICE_ROW\s*=\s*\{([^}]*)\}/);
if (!m) fail('audit.html: PRACTICE_ROW not found, so the privacy join cannot be checked');
else {
  const names = [...m[1].matchAll(/:\s*'([^']+)'/g)].map(x => x[1]);
  const have = new Set(((DP && DP.rows) || []).map(r => r.provider));
  for (const n of names) if (!have.has(n)) fail(`audit.html maps a provider to "${n}", which has no data_practices row`);
  if (!names.length) fail('audit.html: PRACTICE_ROW is empty');
}

// 3. No live page links to a retired page
const RETIRED = ['ai-clock.html', 'transparency-index.html'];
for (const f of fs.readdirSync(R).filter(f => f.endsWith('.html') && !RETIRED.includes(f))) {
  const src = fs.readFileSync(R + f, 'utf8');
  for (const r of RETIRED)
    if (new RegExp('href=["\'][^"\']*' + r.replace('.', '\\.')).test(src)) fail(`${f} still links to the retired ${r}`);
}

// 4. Staleness
const lv = TI._meta && TI._meta.last_verified;
if (lv) {
  const days = Math.floor((Date.now() - Date.parse(lv)) / 86400000);
  if (days > 120) warn(`data_practices last verified ${lv} (${days} days ago). Re-read the eight providers' consumer privacy pages (FRESHNESS E1f).`);
} else warn('_meta.last_verified is missing, so the age of the privacy grades is unknown');

for (const w of warnings) console.log('  ! ' + w);
if (errors.length) {
  console.error('\n' + errors.map(e => '  ✗ ' + e).join('\n') + `\n\n${errors.length} PROBLEM(S)`);
  process.exit(1);
}
console.log(`TRANSPARENCY CHECKS PASS — ${cells} data-practices cells graded and sourced, ${DP.rows.length} providers, no live page links to a retired one`);
