#!/usr/bin/env node
'use strict';

// Stage the real provider tokenizer assets for EcoMeter's exact-LOCAL counting
// (Phase 3 of tokenizer accuracy). Writes into extension/tokenizers/. This script
// only DOWNLOADS files — nothing here runs in the extension, and the extension does
// nothing with these assets until an encoder module verifies against reference counts
// (see extension/tokenizers/README.md). So merging the plumbing is always safe.
//
// Some source repos are license-gated on Hugging Face (Gemma, some Mistral) and will
// return 401/403 — the script reports that and prints the manual step rather than
// failing the whole run.
//
//   node scripts/fetch-tokenizers.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const OUT = path.resolve(__dirname, '..', 'extension', 'tokenizers');

// Optional Hugging Face token (env) so CI can pull license-gated repos (Gemma, some
// Mistral). Without it, gated repos 401 and are skipped; public repos (DeepSeek) work.
const HF_TOKEN = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN || '';

// URLs are best-known public locations; pin to a specific model revision you trust.
// The tokenizer is shared across a family's versions, so any one model's file works.
const ASSETS = [
  { name: 'deepseek.tokenizer.json',
    url:  'https://huggingface.co/deepseek-ai/DeepSeek-V3/resolve/main/tokenizer.json',
    for:  'DeepSeek — byte-level BPE (HuggingFace tokenizer.json)' },
  { name: 'tekken.json',
    url:  'https://huggingface.co/mistralai/Mistral-Small-3.2-24B-Instruct-2506/resolve/main/tekken.json',
    for:  'Mistral — Tekken (tiktoken family)', gated: true },
  { name: 'gemma.tokenizer.model',
    url:  'https://huggingface.co/google/gemma-3-4b-it/resolve/main/tokenizer.model',
    for:  'Gemini/Gemma — SentencePiece model', gated: true },
];

function get(url, depth = 0) {
  return new Promise((resolve, reject) => {
    if (depth > 5) return reject(new Error('too many redirects'));
    const headers = { 'user-agent': 'ecometer-fetch-tokenizers' };
    if (HF_TOKEN) headers['authorization'] = 'Bearer ' + HF_TOKEN;
    https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(res.headers.location, depth + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(Object.assign(new Error('HTTP ' + res.statusCode), { code: res.statusCode }));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { fetched: new Date().toISOString(), assets: {} };
  let ok = 0;

  for (const a of ASSETS) {
    console.log(`• ${a.for}\n  ${a.url}`);
    try {
      const buf = await get(a.url);
      const sha = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
      fs.writeFileSync(path.join(OUT, a.name), buf);
      manifest.assets[a.name] = { url: a.url, bytes: buf.length, sha256_16: sha };
      console.log(`  ✓ saved ${a.name} — ${(buf.length / 1e6).toFixed(2)} MB, sha ${sha}\n`);
      ok++;
    } catch (e) {
      const gatedNote = a.gated || e.code === 401 || e.code === 403
        ? ' — this repo is license-gated on Hugging Face.' : '';
      console.log(`  ✗ ${e.message}${gatedNote}`);
      console.log(`    Manual: sign in / accept the model license, download its tokenizer file,`);
      console.log(`    and save it as  extension/tokenizers/${a.name}\n`);
      manifest.assets[a.name] = { url: a.url, error: String(e.message) };
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Wrote extension/tokenizers/manifest.json  (${ok}/${ASSETS.length} downloaded)`);
  console.log('\nNext steps (see extension/tokenizers/README.md):');
  console.log('  1. Generate reference counts with each provider\'s official tokenizer.');
  console.log('  2. The bundled encoder self-verifies against them and only then turns on —');
  console.log('     an unverified or mismatching encoder stays OFF (falls back to the estimate).');
})();
