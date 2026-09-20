#!/usr/bin/env node
/**
 * EcoMeter AI — extension manifest consistency.
 *
 * FRESHNESS G2 says host_permissions and content_scripts[].matches "must stay in
 * step with PLATFORMS and with reality", and until 2026-09-19 nothing checked it.
 * The failure is silent in the worst way: a platform added to content.js without a
 * manifest entry never runs, so EcoMeter shows a panel that simply never counts —
 * the same signature as the DOM-selector rot G1 warns about, but caused by us.
 *
 * The x.com carve-out is the reason this is a script and not a one-line diff.
 * x.com IS in PLATFORMS and is deliberately NOT in content_scripts.matches,
 * because x.com is Twitter/X and injecting across that whole domain to reach Grok
 * would be a privacy regression. It is reached by programmatic injection instead
 * (background.js, scripting + activeTab). So "every platform must be in matches"
 * is the WRONG rule, and writing it would invite someone to "fix" x.com by adding
 * it — quietly widening the extension's reach across all of X. The rule is: every
 * platform is either declared, or on the explicit programmatic list below.
 *
 * Run: node scripts/check-extension.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const manifest = JSON.parse(read('extension/manifest.json'));
const content = read('extension/content.js');
const background = read('extension/background.js');

let bad = 0;
const fail = s => { console.log('  X ' + s); bad++; };

// Hosts reached by programmatic injection rather than a declarative match, and
// WHY. Adding to this list is a deliberate act; it should need a reason.
const PROGRAMMATIC = {
  'x.com': 'Twitter/X — injecting across the whole domain to reach Grok would be a ' +
           'privacy regression. background.js injects only on x.com/i/grok paths.',
};

// PLATFORMS keys, read from the object rather than guessed.
const pi = content.indexOf('const PLATFORMS');
if (pi < 0) { fail('content.js no longer declares PLATFORMS'); }
const block = content.slice(pi, content.indexOf('\n};', pi));
const platforms = [...new Set([...block.matchAll(/^\s{2}'([a-z0-9.-]+\.[a-z]{2,})'\s*:/gm)].map(m => m[1]))];
if (platforms.length < 5) fail('parsed only ' + platforms.length + ' PLATFORMS entries — the parser has drifted from the file shape');

const matches = (manifest.content_scripts || []).flatMap(s => s.matches || []);
const hostPerms = manifest.host_permissions || [];
const hostOf = pattern => pattern.replace(/^https:\/\//, '').replace(/\/\*$/, '').replace(/^\*\./, '');
const matchHosts = new Set(matches.map(hostOf));
const permHosts = new Set(hostPerms.map(hostOf));

for (const h of platforms) {
  if (PROGRAMMATIC[h]) {
    // The carve-out must STAY carved out.
    if (matchHosts.has(h))
      fail(h + ' is in content_scripts.matches but is meant to be programmatic-injection only — ' + PROGRAMMATIC[h]);
    if (!/scripting/.test(JSON.stringify(manifest.permissions || [])))
      fail(h + ' needs programmatic injection but the manifest does not request the "scripting" permission');
    if (!background.includes(h))
      fail(h + ' is listed as programmatic-injection only but background.js never mentions it');
    continue;
  }
  if (!matchHosts.has(h))
    fail('PLATFORMS has ' + h + ' but no content_scripts match — the content script will never run there, silently');
  if (!permHosts.has(h))
    fail('PLATFORMS has ' + h + ' but no host_permissions entry');
}
// And the reverse: a match with no platform injects for nothing.
for (const h of matchHosts)
  if (!platforms.includes(h))
    fail('content_scripts matches ' + h + ' but PLATFORMS has no entry — injecting on a site we cannot read');

// G5: the version a user sees must be the version we think we shipped.
const pkgVersion = JSON.parse(read('extension/prices.json'))._meta.version;
if (pkgVersion && pkgVersion !== manifest.version)
  fail('manifest.json version ' + manifest.version + ' but prices.json _meta.version ' + pkgVersion);

console.log(bad ? '\n' + bad + ' PROBLEM(S)'
  : 'EXTENSION CHECKS PASS — ' + platforms.length + ' platforms (' +
    (platforms.length - Object.keys(PROGRAMMATIC).filter(h => platforms.includes(h)).length) +
    ' declared, ' + Object.keys(PROGRAMMATIC).filter(h => platforms.includes(h)).length +
    ' programmatic), manifest v' + manifest.version);
process.exit(bad ? 1 : 0);
