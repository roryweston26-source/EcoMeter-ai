#!/usr/bin/env node
/**
 * EcoMeter AI — Version Bumper
 * Increments the LAST component of extension/manifest.json's version
 * (e.g. 6.7 → 6.8 → 6.9 → 6.10) and prints the new version to stdout.
 *
 * The Chrome Web Store rejects any upload whose version is not strictly higher
 * than the currently published one (PKG_INVALID_VERSION_NUMBER). The publish
 * workflow calls this REACTIVELY — only when an upload is rejected as a duplicate
 * — then rebuilds and retries. It is not called proactively, so a manually set
 * version is uploaded as-is and manual/automatic bumps never collide.
 *
 * It bumps BOTH extension/manifest.json and extension/prices.json's
 * _meta.version, because build-extension.js refuses to package the two out of
 * step. Before 2026-08-29 this bumped the manifest alone, so a reactive bump
 * silently desynced them — nothing checked, so nothing complained.
 *
 * Uses a surgical string replace so the rest of each file stays
 * byte-for-byte identical (preserving manifest.json's \u escapes and formatting).
 *
 * Run manually: node scripts/bump-version.js
 */

const fs   = require('fs');
const path = require('path');

const MANIFEST = path.join(__dirname, '../extension/manifest.json');
const PRICES   = path.join(__dirname, '../extension/prices.json');

let text = fs.readFileSync(MANIFEST, 'utf8');
const current = JSON.parse(text).version;

const parts = current.split('.').map(Number);
if (parts.length === 0 || parts.some(Number.isNaN)) {
  console.error(`✗ Cannot parse manifest version "${current}"`);
  process.exit(1);
}

parts[parts.length - 1] += 1;
const next = parts.join('.');

// Match the exact "version": "x.y" line and swap only the number.
const re = new RegExp(`("version"\\s*:\\s*")${current.replace(/\./g, '\\.')}(")`);
if (!re.test(text)) {
  console.error(`✗ Could not locate version "${current}" in manifest.json`);
  process.exit(1);
}

// prices.json carries the same version in _meta. Rewrite it in the same pass, and
// fail before writing either file if it isn't where we expect — a half-applied
// bump is worse than no bump, because the next build is the thing that discovers it.
let pricesText = fs.readFileSync(PRICES, 'utf8');
const pricesCurrent = JSON.parse(pricesText)._meta.version;
if (pricesCurrent !== current) {
  console.error(`✗ prices.json _meta.version ("${pricesCurrent}") does not match manifest ("${current}") — fix that by hand first.`);
  process.exit(1);
}
const pricesRe = new RegExp(`("version"\\s*:\\s*")${current.replace(/\./g, '\\.')}(")`);
if (!pricesRe.test(pricesText)) {
  console.error(`✗ Could not locate version "${current}" in prices.json`);
  process.exit(1);
}

text = text.replace(re, `$1${next}$2`);
pricesText = pricesText.replace(pricesRe, `$1${next}$2`);
fs.writeFileSync(MANIFEST, text);
fs.writeFileSync(PRICES, pricesText);

// Only the new version goes to stdout so CI can capture it cleanly.
console.log(next);
