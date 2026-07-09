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
 * Uses a surgical string replace so the rest of manifest.json stays
 * byte-for-byte identical (preserving its \u escapes and formatting).
 *
 * Run manually: node scripts/bump-version.js
 */

const fs   = require('fs');
const path = require('path');

const MANIFEST = path.join(__dirname, '../extension/manifest.json');

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

text = text.replace(re, `$1${next}$2`);
fs.writeFileSync(MANIFEST, text);

// Only the new version goes to stdout so CI can capture it cleanly.
console.log(next);
