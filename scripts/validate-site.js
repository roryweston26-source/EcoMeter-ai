#!/usr/bin/env node
'use strict';

// Pre-deploy sanity check for the static site served by GitHub Pages.
//
// GitHub Pages serves the repo-root *.html files verbatim — there is no build
// step, so nothing normally parses them before they go live. A broken <script>
// tag, a renamed page, or a malformed prices.json would only be discovered by
// visitors. This script is that missing gate: it runs in CI on PRs into main,
// so problems surface before the merge that deploys.
//
// Zero dependencies on purpose (there is no root package.json). It is
// deliberately conservative — it only flags things that are unambiguously
// broken, so it passes on the working site and never blocks a good merge.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const errors = [];
const checkedJson = new Set();

// Extensions we treat as "a real local file that must exist on disk".
// Extensionless links (routes, "/", "/#tools") are intentionally ignored.
const ASSET_EXT = new Set([
  '.html', '.json', '.js', '.css',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
]);

function listRootHtml() {
  return fs
    .readdirSync(repoRoot)
    .filter((f) => f.toLowerCase().endsWith('.html'))
    .map((f) => path.join(repoRoot, f));
}

// Count non-overlapping occurrences of a plain substring (case-insensitive).
function count(haystack, needle) {
  return haystack.toLowerCase().split(needle.toLowerCase()).length - 1;
}

// Resolve a referenced path to an on-disk absolute path, or null if it is
// external / an anchor / not something we should check.
function resolveRef(raw, htmlFile) {
  let v = raw.trim();
  if (!v) return null;
  v = v.split('#')[0].split('?')[0]; // drop fragment + query
  if (!v) return null; // was a pure #anchor
  if (/^(https?:)?\/\//i.test(v)) return null; // external / protocol-relative
  if (/^(mailto:|tel:|data:|javascript:)/i.test(v)) return null;

  const base = v.startsWith('/')
    ? path.join(repoRoot, v.slice(1)) // root-absolute -> repo root
    : path.join(path.dirname(htmlFile), v); // relative to the html file

  const ext = path.extname(base).toLowerCase();
  if (!ASSET_EXT.has(ext)) return null; // extensionless route -> skip
  return base;
}

function validateJson(absPath, referencedBy) {
  if (checkedJson.has(absPath)) return;
  checkedJson.add(absPath);
  const rel = path.relative(repoRoot, absPath);
  try {
    JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (e) {
    errors.push(`${referencedBy}: referenced JSON "${rel}" is not valid JSON — ${e.message}`);
  }
}

function validateHtml(htmlFile) {
  const rel = path.relative(repoRoot, htmlFile);
  const src = fs.readFileSync(htmlFile, 'utf8');

  // 1. Structural sanity.
  if (!/<!doctype/i.test(src)) errors.push(`${rel}: missing <!doctype> declaration`);
  if (count(src, '<html') === 0) errors.push(`${rel}: no <html> tag`);

  // 2. Unbalanced containers that would swallow or break the rest of the page.
  const pairs = [
    ['<script', '</script>'],
    ['<style', '</style>'],
    ['<!--', '-->'],
  ];
  for (const [open, close] of pairs) {
    const o = count(src, open);
    const c = count(src, close);
    if (o !== c) {
      errors.push(`${rel}: unbalanced ${open}…${close} (${o} opening, ${c} closing) — a page-breaking typo`);
    }
  }

  // 3. Local references (href/src + fetch('…')) must point to files that exist.
  const refs = [];
  const attrRe = /\b(?:href|src)\s*=\s*"([^"]*)"/gi;
  const fetchRe = /fetch\(\s*['"]([^'"]+)['"]/gi;
  let m;
  while ((m = attrRe.exec(src)) !== null) refs.push(m[1]);
  while ((m = fetchRe.exec(src)) !== null) refs.push(m[1]);

  for (const raw of refs) {
    const abs = resolveRef(raw, htmlFile);
    if (!abs) continue;
    if (!fs.existsSync(abs)) {
      errors.push(`${rel}: broken local reference "${raw}" -> ${path.relative(repoRoot, abs)} does not exist`);
      continue;
    }
    if (path.extname(abs).toLowerCase() === '.json') validateJson(abs, rel);
  }
}

const htmlFiles = listRootHtml();
if (htmlFiles.length === 0) {
  console.error('No root *.html files found — nothing to validate. (Is this the site repo?)');
  process.exit(1);
}

for (const f of htmlFiles) validateHtml(f);

console.log(`Checked ${htmlFiles.length} page(s): ${htmlFiles.map((f) => path.basename(f)).join(', ')}`);
if (checkedJson.size > 0) {
  console.log(`Validated ${checkedJson.size} referenced JSON file(s).`);
}

if (errors.length > 0) {
  console.error(`\n✗ Site validation failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  • ${e}`);
  console.error('\nThe site deploys straight to GitHub Pages on merge, so fix these before merging.');
  process.exit(1);
}

console.log('\n✓ Site validation passed — safe to deploy.');
