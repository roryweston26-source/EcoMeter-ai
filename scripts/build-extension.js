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
 * Reproducible in the real sense as of 2026-08-29: every entry is stamped with
 * the HEAD commit's time in UTC, not the file's mtime, so the same commit builds
 * to the same bytes on any machine and in CI. Override with SOURCE_DATE_EPOCH.
 *
 * Won't overwrite a package unless told to, as of 2026-09-30. The zips are
 * gitignored, so one that gets overwritten can't come back from git, and a
 * rebuild only matches it if extension/ and the stamp time are unchanged. Until
 * then every argument but --check was ignored: a `--help` "sanity check" built
 * straight over the v6.15 zip that went to the store on 2026-09-19. Now an
 * existing ecometer-ai-v<version>.zip stops the build unless --force is passed,
 * and any other argument, --help included, prints usage, exits 2 and builds
 * nothing. --check still writes nothing and still passes with a zip in place.
 * CI is unaffected: it builds in a fresh checkout, and publish.yml deletes the
 * file before each attempt anyway.
 *
 * Run:  node scripts/build-extension.js          # build + verify
 *       node scripts/build-extension.js --check  # verify only, write nothing
 *       node scripts/build-extension.js --force  # replace an existing zip
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'extension');

// Docs for the humans filling in the dashboard; they must not ship to users.
const EXCLUDE = new Set(['STORE-LISTING.md', 'STORE-SUBMISSION.md']);

// ── Arguments ───────────────────────────────────────────────────────────────
// Checked before anything else, so a bad flag builds nothing. Every argument
// but --check used to be ignored, which is how `--help` came to overwrite a
// package.
const USAGE = [
  'usage: node scripts/build-extension.js [--check | --force]',
  '',
  '  (no flag)  verify, then write ecometer-ai-v<version>.zip at the repo root;',
  '             stops if that file already exists',
  '  --check    verify only, write nothing',
  '  --force    build even if that file exists, replacing it',
].join('\n');
const args = process.argv.slice(2);
const unknown = args.filter(a => a !== '--check' && a !== '--force');
const both = args.includes('--check') && args.includes('--force');
if (unknown.length || both) {
  if (unknown.length) console.error('unknown argument: ' + unknown.join(' '));
  else console.error('--check and --force cannot be combined: --check never writes');
  console.error('\n' + USAGE);
  process.exit(2);
}
const FORCE = args.includes('--force');

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

if (args.includes('--check')) { console.log('\n--check: verified, nothing written'); process.exit(0); }

// ── Refuse to overwrite a package ───────────────────────────────────────────
// After --check on purpose: verifying is always safe, so --check must still
// pass with a zip in place.
const outPath = path.join(ROOT, 'ecometer-ai-v' + version + '.zip');
let existing = null;
try { existing = fs.statSync(outPath); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (existing) {
  const name = path.basename(outPath);
  const size = existing.size.toLocaleString('en-US') + ' bytes';
  const when = existing.mtime.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  if (!FORCE) {
    console.error([
      '',
      'NOT BUILT: ' + name + ' already exists',
      '  size      ' + size + ' (' + (existing.size / 1024 / 1024).toFixed(2) + ' MB)',
      '  modified  ' + when,
      "  Zips are gitignored, so git can't give this one back. A rebuild only",
      "  matches it if extension/ and the stamp time (HEAD's commit time, or",
      '  SOURCE_DATE_EPOCH) are unchanged.',
      "  If it's the package you uploaded, leave it alone. To build anyway,",
      '  move it aside, or replace it with:  node scripts/build-extension.js --force',
    ].join('\n'));
    process.exit(1);
  }
  console.log('  --force: replacing ' + name + ', ' + size + ', modified ' + when);
}

// ── Write the archive ───────────────────────────────────────────────────────
const crc32 = zlib.crc32 ? (buf => zlib.crc32(buf) >>> 0) : (() => {
  const T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
  return buf => { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
})();

// Zip entries carry a modification time, and stamping each file's own mtime made
// the archive a function of the CHECKOUT rather than the commit: actions/checkout
// rewrites every mtime to the moment it ran, so CI could never reproduce a local
// build of the same commit, and two CI runs of one commit differed too. Stamp a
// single commit-derived time on every entry instead, read in UTC so the building
// machine's timezone drops out as well.
function sourceDate() {
  if (process.env.SOURCE_DATE_EPOCH) return new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000);
  try {
    const ct = require('child_process')
      .execSync('git log -1 --format=%ct', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    if (/^\d+$/.test(ct)) return new Date(Number(ct) * 1000);
  } catch { /* no git, or no commits yet — fall through */ }
  return new Date(Date.UTC(2026, 0, 1));   // last resort: fixed, so still deterministic
}
const STAMP = sourceDate();

const dosTime = d => ((d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() / 2)) & 0xFFFF;
const dosDate = d => (((d.getUTCFullYear() - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate()) & 0xFFFF;

const locals = [], central = [];
let offset = 0;
for (const f of files) {
  const data = fs.readFileSync(f.full);
  const comp = zlib.deflateRawSync(data, { level: 9 });
  const name = Buffer.from(f.rel, 'utf8');          // forward slashes: walk() built them
  const crc = crc32(data), t = dosTime(STAMP), d = dosDate(STAMP);

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
// 'wx' won't replace a file that appeared since the check above; only a --force
// that passed it may overwrite.
fs.writeFileSync(outPath, zip, { flag: existing ? 'w' : 'wx' });

console.log('\nWROTE ' + path.basename(outPath) + '  (' + (zip.length / 1024 / 1024).toFixed(2) + ' MB)');
for (const f of files) console.log('    ' + f.rel);
