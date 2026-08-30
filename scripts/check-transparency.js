#!/usr/bin/env node
'use strict';

// Guard for the AI Transparency Index (transparency-index.json + datacenters.json).
//
// Why this exists, in one sentence: on 2026-08-29 a re-read found EIGHT wrong cells
// across two axes, and every single one of them would have passed validate-site.js.
// That script checks form. This one checks the promises the page makes about itself.
//
// The four failure modes it gates, all of them observed live in this repo:
//
//   1. MAINTAINER-SPEAK IN PUBLIC COPY. Cell notes and site water_notes render on
//      the page. A note shipped in the Microsoft PR containing "Do not flip this
//      grade on the strength of that row" went live. Asked for in PROJECT-CONTEXT
//      open thread 17; this is that check.
//
//   2. DOC TABLES DRIFTING FROM THE JSON. PROJECT-CONTEXT §7 carried a pricing
//      table that disagreed with the JSON in nine cells, and a §10 caveat saying
//      two axes were unscored, for four days short of a year. Three copies of one
//      fact, drifting — the failure this repo keeps paying for.
//
//   3. A BROKEN SOURCING PROMISE. _meta.methodology says "Every grade links to its
//      sources" and gives a count. That was false once already (36 of 42 cells were
//      plain text). If a future pass adds a provider or a dimension without a link,
//      the page starts lying about itself again.
//
//   4. HARDCODED COVERAGE COUNTS. "12 sites across 7 providers" is typed into prose
//      in two files and derived from datacenters.json in neither.
//
// Zero dependencies, same as its siblings. It only fails on things that are
// unambiguously wrong, so it passes on a good tree and never blocks a real merge.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const errors = [];
const warnings = [];

const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function readJson(rel) {
  const p = path.join(repoRoot, rel);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fail(`${rel} could not be parsed: ${e.message}`);
    return null;
  }
}

const TI = readJson('transparency-index.json');
const DC = readJson('datacenters.json');
if (!TI || !DC) {
  console.error('\n' + errors.map((e) => '  ✗ ' + e).join('\n') + '\n');
  process.exit(1);
}

const SYM = { green: '🟢', yellow: '🟡', red: '🔴', pending: '⚪' };
const VALID_GRADES = Object.keys(SYM);

// Every matrix on the page: [label, columns, rows]
function matrices() {
  const out = [['environmental', TI.columns, TI.rows]];
  for (const key of ['pricing', 'data_practices']) {
    const b = TI[key];
    if (b && b.columns && b.rows) out.push([key, b.columns, b.rows]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. Every cell is complete, and every grade links to a source.
// ---------------------------------------------------------------------------
let cellCount = 0;
let linkedCount = 0;

for (const [axis, columns, rows] of matrices()) {
  for (const row of rows) {
    if (!row.cells) {
      fail(`${axis}: row "${row.provider}" has no cells object`);
      continue;
    }
    for (const col of columns) {
      const cell = row.cells[col.key];
      if (!cell) {
        fail(`${axis}: ${row.provider} is missing the "${col.key}" cell`);
        continue;
      }
      cellCount++;
      if (!VALID_GRADES.includes(cell.grade))
        fail(`${axis}: ${row.provider}/${col.key} has invalid grade "${cell.grade}"`);
      if (!cell.note || !cell.note.trim())
        fail(`${axis}: ${row.provider}/${col.key} has no note — an ungraded reason is not a finding`);
      if (cell.source_url && /^https?:\/\//.test(cell.source_url)) linkedCount++;
      else
        fail(
          `${axis}: ${row.provider}/${col.key} has no source_url. ` +
            '_meta.methodology promises every grade links to its sources.'
        );
    }
  }
}

// The methodology sentence states the link count out loud. Keep it true.
const methodology = (TI._meta && TI._meta.methodology) || '';
const claimed = methodology.match(/(\d+)\s+of\s+\1\b/);
if (claimed) {
  const n = Number(claimed[1]);
  if (n !== cellCount)
    fail(
      `_meta.methodology claims "${n} of ${n}" sourced cells but there are now ${cellCount}. ` +
        'Adding a provider or a dimension means updating that sentence in the same commit.'
    );
}

// ---------------------------------------------------------------------------
// 2. No maintainer-speak in copy that renders on the page.
//    Open thread 17. Site notes and cell notes are PUBLIC.
// ---------------------------------------------------------------------------
const MAINTAINER_SPEAK = [
  [/\bdo not (flip|change|edit|touch|remove|reconcile)\b/i, 'an instruction to a maintainer'],
  [/\bdon't (flip|change|edit|touch|remove|reconcile)\b/i, 'an instruction to a maintainer'],
  [/\bthis file\b/i, 'a reference to the file rather than the subject'],
  [/\b(future|next) pass\b/i, 'a note to a future session'],
  [/\bTODO\b/, 'a TODO'],
  [/\bFIXME\b/, 'a FIXME'],
  [/\bopen thread\b/i, 'a pointer to PROJECT-CONTEXT'],
  [/\bFRESHNESS\.md\b/i, 'a pointer to FRESHNESS.md'],
  [/\bPROJECT-CONTEXT\b/i, 'a pointer to PROJECT-CONTEXT'],
];

function scanPublicCopy(where, text) {
  if (!text) return;
  for (const [re, why] of MAINTAINER_SPEAK) {
    if (re.test(text))
      fail(
        `${where} contains ${why} — this text RENDERS ON THE PAGE. ` +
          'Maintainer guidance belongs in FRESHNESS.md or _meta.verification_status.'
      );
  }
}

for (const [axis, columns, rows] of matrices()) {
  for (const row of rows)
    for (const col of columns) {
      const cell = row.cells && row.cells[col.key];
      if (cell) scanPublicCopy(`${axis} note ${row.provider}/${col.key}`, cell.note);
    }
}
for (const site of DC.sites || []) scanPublicCopy(`datacenters.json water_note for "${site.name}"`, site.water_note);

// ---------------------------------------------------------------------------
// 3. Hardcoded coverage counts must match datacenters.json.
// ---------------------------------------------------------------------------
const sites = DC.sites || [];
const siteCount = sites.length;
const providerCount = new Set(sites.map((s) => s.provider)).size;

function checkCoverageProse(label, text) {
  if (!text) return;
  const re = /(\d+)\s+sites?\s+(?:across|\/|from)\s+(\d+)\s+providers?/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const [, s, p] = m;
    if (Number(s) !== siteCount || Number(p) !== providerCount)
      fail(
        `${label} says "${m[0]}" but datacenters.json has ${siteCount} sites across ` +
          `${providerCount} providers. Grep for digits in prose after any structural change.`
      );
  }
}

for (const c of (TI._meta && TI._meta.caveats) || []) checkCoverageProse('transparency-index.json _meta.caveats', c);
checkCoverageProse('transparency-index.json _meta.methodology', methodology);
for (const f of ['PROJECT-CONTEXT.md', 'FRESHNESS.md']) {
  const p = path.join(repoRoot, f);
  if (fs.existsSync(p)) checkCoverageProse(f, fs.readFileSync(p, 'utf8'));
}

// ---------------------------------------------------------------------------
// 4. The grade tables in PROJECT-CONTEXT must match the JSON.
//    This is the check that would have caught the nine-cell pricing drift.
// ---------------------------------------------------------------------------
const pcPath = path.join(repoRoot, 'PROJECT-CONTEXT.md');
if (fs.existsSync(pcPath)) {
  const pc = fs.readFileSync(pcPath, 'utf8');
  const SYM_RE = /🟢|🟡|🔴|⚪/g;

  // Identify each markdown table by its HEADER, not by its width. Two matrices can
  // share a column count — data-practices reached five columns on 2026-08-29 and
  // immediately started being compared against the pricing table.
  const lines = pc.split('\n');
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\|/.test(lines[i])) continue;
    const start = i;
    while (i < lines.length && /^\|/.test(lines[i])) i++;
    tables.push({ header: lines[start], body: lines.slice(start + 1, i) });
  }

  // Score a header against a matrix by how many of its columns are recognisable in it.
  function scoreHeader(header, columns) {
    const h = header.toLowerCase();
    let hits = 0;
    for (const c of columns) {
      const words = (c.label || c.key).toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
      const keyWords = c.key.toLowerCase().split('_').filter((w) => w.length > 3);
      if ([...words, ...keyWords].some((w) => h.includes(w.slice(0, 6)))) hits++;
    }
    return hits;
  }

  for (const table of tables) {
    let best = null;
    for (const [axis, columns, rows] of matrices()) {
      const score = scoreHeader(table.header, columns);
      if (score > columns.length / 2 && (!best || score > best.score)) best = { axis, columns, rows, score };
    }
    if (!best) continue; // not one of our grade tables

    for (const line of table.body) {
      const m = line.match(/^\|\s*([^|]+?)\s*\|(.+)\|\s*$/);
      if (!m) continue;
      const provider = m[1].replace(/\*/g, '').trim();
      const row = best.rows.find((r) => r.provider === provider);
      if (!row) continue; // separator row, or a summary naming several providers
      const syms = m[2].match(SYM_RE) || [];
      // A row that names a real provider but carries the wrong number of grades means
      // the doc table has lost a column — which is how adding the advertising
      // dimension nearly slipped past this check silently.
      if (syms.length !== best.columns.length) {
        fail(
          `PROJECT-CONTEXT.md's ${best.axis} table gives ${provider} ${syms.length} grades, ` +
            `but that matrix has ${best.columns.length} dimensions ` +
            `(${best.columns.map((c) => c.key).join(', ')}). The table is missing a column.`
        );
        continue;
      }
      const expected = best.columns.map((c) => SYM[row.cells[c.key].grade]);
      // A trailing change-marker like "🟢 ⬆" is fine — only the grade symbols compare.
      if (syms.join('') !== expected.join(''))
        fail(
          `PROJECT-CONTEXT.md has ${provider} as ${syms.join('')} for the ${best.axis} ` +
            `matrix, but transparency-index.json says ${expected.join('')}. ` +
            'Regenerate the table from the JSON rather than editing it by hand.'
        );
    }
  }

  // The §10 caveat used to claim two axes were unscored long after they were.
  // Only flag it as an ASSERTION: a line that quotes the old wording while
  // correcting it ("this line used to say ...") is exactly what we want to keep.
  const axes = (TI._meta && TI._meta.axes) || [];
  const allScored = axes.length > 0 && axes.every((a) => a.state === 'scored');
  if (allScored) {
    // Two things keep this from firing on its own documentation:
    //   - a QUOTED phrase is a citation, not a claim ("this line used to say ...")
    //   - an explicit correction marker on the same line
    const CORRECTION = /used to say|was wrong|no longer|previously said|had been wrong|had gone unnoticed/i;
    const STALE = /pricing\/data axes are ⚪|env-only/i;
    const QUOTED = /["“”'`]\s*[^"“”'`]*(?:pricing\/data axes are ⚪|env-only)[^"“”'`]*\s*["“”'`]/i;
    for (const line of pc.split('\n')) {
      if (!STALE.test(line)) continue;
      if (QUOTED.test(line) || CORRECTION.test(line)) continue;
      fail(
        'PROJECT-CONTEXT.md still describes the Transparency Index as env-only, but ' +
          '_meta.axes reports every axis as scored. Line: ' + line.trim().slice(0, 120)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Soft checks — worth a look, never a merge blocker.
// ---------------------------------------------------------------------------
const lastVerified = TI._meta && TI._meta.last_verified;
if (lastVerified) {
  const age = (Date.now() - Date.parse(lastVerified)) / 86400000;
  if (Number.isFinite(age) && age > 120)
    warn(
      `_meta.last_verified is ${Math.round(age)} days old (${lastVerified}). ` +
        'The data-practices axis rots fastest — defaults change with unannounced policy updates.'
    );
}
for (const [axis, columns, rows] of matrices()) {
  // A ⚪ whose note says it is deliberate (Microsoft has no consumer rate card to
  // publish) is a finished decision, not a backlog item. Warning about it forever
  // just trains people to ignore this script's output.
  const pending = [];
  for (const row of rows)
    for (const col of columns) {
      const cell = row.cells[col.key];
      if (!cell || cell.grade !== 'pending') continue;
      if (/not graded|by design|deliberately|not applicable/i.test(cell.note || '')) continue;
      pending.push(`${row.provider}/${col.key}`);
    }
  if (pending.length)
    warn(`${axis}: ${pending.length} cell(s) still ⚪ — ${pending.join(', ')}. ⚪ is honest, but it is not finished.`);
}

// ---------------------------------------------------------------------------
console.log('');
if (warnings.length) console.log(warnings.map((w) => '  ! ' + w).join('\n') + '\n');

if (errors.length) {
  console.error('TRANSPARENCY INDEX CHECKS FAILED\n');
  console.error(errors.map((e) => '  ✗ ' + e).join('\n'));
  console.error('');
  process.exit(1);
}

console.log(
  `TRANSPARENCY CHECKS PASS — ${cellCount} cells across ${matrices().length} matrices, ` +
    `${linkedCount}/${cellCount} sourced, ${siteCount} sites / ${providerCount} providers`
);
