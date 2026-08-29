#!/usr/bin/env node
/**
 * build-extension.js — packages extension/ into the store-upload zip.
 *
 * This existed only as a manual step until 2026-08-28, which is why the v6.13
 * package shipped whatever happened to be in the folder. Now it is reproducible
 * and it checks the things that have actually gone wrong before.
 *
 * Zero dependencies and no zip binary: there is no `zip` on this machine, and
 * PowerShell's Compress-Archive can write entry names with BACKSLASHES, which
 * Chrome rejects. So the archive is written here, with forward slashes,
 * deflated through zlib.
 *
 * Run:  node scripts/build-extension.js          # build + verify
 *       node scripts/build-extension.js --check  # verify only, write nothing
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'extension');

// Docs for the humans filling in the dashboard; they must not ship to users.
const EXCLUDE = new Set(['STORE-LISTING.md', 'STORE-SUBMISSION.md']);

// ── Collect files ───────────────────────────────────────────────────────────
function walk(dir, base = '') {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const rel = base ? base + '/' + name : name;
    if (EXCLUDE.has(rel)) continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, rel));
    else out.push({ rel, full, size: st.size, mtime: st.mtime });
  }
  return out;
}

// ── Pre-flight checks ───────────────────────────────────────────────────────
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const prices = JSON.parse(fs.readFileSync(path.join(SRC, 'prices.json'), 'utf8'));
const version = manifest.version;
const problems = [];

if (!/^\d+(\.\d+)*$/.test(version)) problems.push('manifest version is not numeric: ' + version);
if (prices._meta.version !== version)
  problems.push('prices.json _meta.version (' + prices._meta.version + ') != manifest version (' + version + ')');

// The v6.12 rejection was for keyword stuffing, and manifest.description IS the
// store's short description, so it is the one field that gets read as spam.
const listing = fs.readFileSync(path.join(SRC, 'STORE-LISTING.md'), 'utf8');
const BRANDS = ['Claude', 'ChatGPT', 'Gemini', 'Grok', 'Mistral', 'Perplexity', 'DeepSeek', 'Copilot', 'Poe'];
const inDesc = BRANDS.filter(b => new RegExp('\\b' + b + '\\b', 'i').test(manifest.description));
if (inDesc.length) problems.push('manifest.description names products (' + inDesc.join(', ') +
  ') — this is the store short description and is what got v6.12 rejected');
if (manifest.description.length > 132)
  problems.push('manifest.description is ' + manifest.description.length + ' chars, over the 132 limit');
if (!listing.includes(manifest.description))
  problems.push('manifest.description does not appear verbatim in STORE-LISTING.md — the two must stay identical');

const files = walk(SRC);
for (const f of ['manifest.json', 'sidepanel.js', 'sidepanel.html', 'water.json', 'prices.json', 'privacy-policy.html'])
  if (!files.some(x => x.rel === f)) problems.push('missing required file: ' + f);
for (const f of files) if (EXCLUDE.has(f.rel)) problems.push('excluded file leaked in: ' + f.rel);

// Compare against the previously shipped package, if it is still around.
const prev = fs.readdirSync(ROOT).filter(f => /^ecometer-ai-v.*\.zip$/.test(f) && !f.includes(version)).sort().pop();

if (problems.length) {
  console.error('BUILD BLOCKED:');
  for (const p of problems) console.error('  X ' + p);
  process.exit(1);
}

console.log('EcoMeter AI v' + version);
console.log('  ' + files.length + ' files, ' + (files.reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(2) + ' MB uncompressed');
console.log('  manifest.description: ' + manifest.description.length + '/132 chars, no product names');
console.log('  prices.json _meta.version matches manifest');
if (prev) console.log('  previous package on disk: ' + prev);

if (process.argv.includes('--check')) { console.log('\n--check: verified, nothing written'); process.exit(0); }

// ── Write the archive ───────────────────────────────────────────────────────
const crc32 = zlib.crc32 ? (buf => zlib.crc32(buf) >>> 0) : (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  return buf => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
})();

const dosTime = d => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() / 2)) & 0xFFFF;
const dosDate = d => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;

const locals = [], central = [];
let offset = 0;
for (const f of files) {
  const data = fs.readFileSync(f.full);
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const name = Buffer.from(f.rel, 'utf8');          // forward slashes: walk() built them
  const crc = crc32(data), t = dosTime(f.mtime), d = dosDate(f.mtime);

  const lh = Buffer.alloc(30);
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
  lh.writeUInt16LE(8, 8); lh.writeUInt16LE(t, 10); lh.writeUInt16LE(d, 12);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22);
  lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  locals.push(lh, name, comp);

  const ch = Buffer.alloc(46);
  ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
  ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(t, 12); ch.writeUInt16LE(d, 14);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24);
  ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
  ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0o644 << 16, 38);
  ch.writeUInt32LE(offset, 42);
  central.push(ch, name);

  offset += lh.length + name.length + comp.length;
}
const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);

const zip = Buffer.concat([...locals, cd, eocd]);
const outPath = path.join(ROOT, 'ecometer-ai-v' + version + '.zip');
fs.writeFileSync(outPath, zip);

console.log('\nWROTE ' + path.basename(outPath) + '  (' + (zip.length / 1024 / 1024).toFixed(2) + ' MB)');
for (const f of files) console.log('    ' + f.rel);
