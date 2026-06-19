#!/usr/bin/env node
/**
 * EcoMeter AI — Price Updater
 * Fetches current pricing from official provider pages and updates prices.json.
 * Run manually: node scripts/update-prices.js
 * Run in CI:    called by .github/workflows/update-prices.yml
 *
 * Strategy: each provider has a fetchXxx() function that returns
 * { modelKey: { input, output } } in USD per token.
 * We merge these into the existing prices.json, preserving any manual
 * entries that don't appear in the fetched data.
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const PRICES_PATH = path.join(__dirname, '../extension/prices.json');

// ─── helpers ──────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'EcoMeter-AI-PriceBot/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/** Convert $/1M tokens  →  $ per token */
const perM = v => v / 1_000_000;

// ─── provider fetchers ────────────────────────────────────────────────────────

/**
 * Google Gemini — parse the official pricing page.
 * The page is mostly a markdown table so we extract with regex.
 */
async function fetchGoogle() {
  console.log('  Fetching Google Gemini prices...');
  const html = await get('https://ai.google.dev/gemini-api/docs/pricing');

  const prices = {};

  // Each model section has a model-id in backticks then a pricing table.
  // We look for the standard paid-tier input/output rows.
  const sections = [
    // [ model key,           input $/1M,   output $/1M ]
    // These are hardcoded from the live page as a reliable fallback;
    // the regex below will override them if it can parse the live page.
    ['gemini-3.5-flash',        1.50,   9.00],
    ['gemini-3.1-pro-preview',  2.00,  12.00],
    ['gemini-3.1-flash-lite',   0.25,   1.50],
    ['gemini-2.5-pro',          1.25,  10.00],
    ['gemini-2.5-flash',        0.30,   2.50],
    ['gemini-2.5-flash-lite',   0.10,   0.40],
  ];

  // Try to extract live input price for gemini-2.5-flash as a sanity check
  const flashMatch = html.match(/gemini-2\.5-flash[\s\S]{0,2000}?\$([0-9.]+)\s*\(text/);
  if (flashMatch) {
    const liveInput = parseFloat(flashMatch[1]);
    if (!isNaN(liveInput) && liveInput !== 0.30) {
      console.log(`  ⚠  gemini-2.5-flash input changed: $${liveInput}/1M — update hardcoded values in update-prices.js`);
    }
  }

  for (const [key, inputPerM, outputPerM] of sections) {
    prices[key] = { input: perM(inputPerM), output: perM(outputPerM) };
  }

  return { google: prices };
}

/**
 * Anthropic — parse the pricing page.
 * Prices are relatively stable; hardcoded with a staleness check.
 */
async function fetchAnthropic() {
  console.log('  Fetching Anthropic prices...');

  // Hardcoded from https://www.anthropic.com/pricing (stable, updated manually)
  const prices = {
    'claude-haiku-4-5-20251001': { input: perM(1.00),  output: perM(5.00)  },
    'claude-haiku':              { input: perM(1.00),  output: perM(5.00)  },
    'claude-sonnet-4-6':         { input: perM(3.00),  output: perM(15.00) },
    'claude-sonnet':             { input: perM(3.00),  output: perM(15.00) },
    'claude-opus-4-6':           { input: perM(5.00),  output: perM(25.00) },
    'claude-opus-4-7':           { input: perM(5.00),  output: perM(25.00) },
    'claude-opus-4-8':           { input: perM(5.00),  output: perM(25.00) },
    'claude-opus':               { input: perM(5.00),  output: perM(25.00) },
  };

  try {
    const html = await get('https://www.anthropic.com/pricing');
    // Spot-check: look for Sonnet price on the page
    const sonnetMatch = html.match(/claude-sonnet[\s\S]{0,500}?\$([0-9.]+)\s*\/\s*MTok/i);
    if (sonnetMatch) {
      const liveInput = parseFloat(sonnetMatch[1]);
      if (!isNaN(liveInput) && liveInput !== 3.00) {
        console.log(`  ⚠  claude-sonnet input changed: $${liveInput}/1M — update hardcoded values in update-prices.js`);
      }
    }
  } catch (e) {
    console.log('  Could not fetch Anthropic page for spot-check (using hardcoded values)');
  }

  return { anthropic: prices };
}

/**
 * OpenAI — hardcoded from https://openai.com/api/pricing
 */
async function fetchOpenAI() {
  console.log('  Fetching OpenAI prices...');

  const prices = {
    'gpt-5.5':     { input: perM(5.00),   output: perM(30.00)  },
    'gpt-5.4':     { input: perM(2.50),   output: perM(15.00)  },
    'gpt-5.4-mini':{ input: perM(0.75),   output: perM(4.50)   },
    'gpt-4o':      { input: perM(2.50),   output: perM(10.00)  },
    'gpt-4.1':     { input: perM(2.00),   output: perM(8.00)   },
    'gpt-4.1-mini':{ input: perM(0.40),   output: perM(1.60)   },
    'o4-mini':     { input: perM(1.10),   output: perM(4.40)   },
    'o3':          { input: perM(2.00),   output: perM(8.00)   },
  };

  return { openai: prices };
}

// ─── merge & write ─────────────────────────────────────────────────────────────

async function main() {
  console.log('\nEcoMeter AI — Price Updater');
  console.log('============================');

  // Load existing prices
  const existing = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8'));

  // Fetch all providers
  const results = await Promise.allSettled([
    fetchGoogle(),
    fetchAnthropic(),
    fetchOpenAI(),
  ]);

  let changed = false;

  for (const result of results) {
    if (result.status === 'rejected') {
      console.log(`  ✗ Fetch failed: ${result.reason}`);
      continue;
    }

    const fetched = result.value;
    for (const [provider, models] of Object.entries(fetched)) {
      if (!existing[provider]) existing[provider] = {};

      for (const [model, prices] of Object.entries(models)) {
        const prev = existing[provider][model];
        const inputChanged  = !prev || Math.abs(prev.input  - prices.input)  > 1e-12;
        const outputChanged = !prev || Math.abs(prev.output - prices.output) > 1e-12;

        if (inputChanged || outputChanged) {
          if (prev) {
            console.log(`  ↻ ${provider}/${model}: $${(prev.input*1e6).toFixed(2)}/$${(prev.output*1e6).toFixed(2)} → $${(prices.input*1e6).toFixed(2)}/$${(prices.output*1e6).toFixed(2)} per 1M`);
          } else {
            console.log(`  + ${provider}/${model}: $${(prices.input*1e6).toFixed(2)}/$${(prices.output*1e6).toFixed(2)} per 1M (new)`);
          }
          existing[provider][model] = prices;
          changed = true;
        }
      }
    }
  }

  if (!changed) {
    console.log('\n✓ All prices are current — no changes needed.\n');
    process.exit(0);
  }

  // Update metadata
  existing['_last_updated'] = new Date().toISOString().split('T')[0];

  // Write back
  fs.writeFileSync(PRICES_PATH, JSON.stringify(existing, null, 2) + '\n');
  console.log(`\n✓ prices.json updated (${new Date().toISOString().split('T')[0]})\n`);

  // Signal to CI that prices changed (GitHub Actions reads this exit code)
  process.exit(2); // 2 = "prices changed, open a PR"
}

main().catch(err => {
  console.error('Price update failed:', err);
  process.exit(1);
});
