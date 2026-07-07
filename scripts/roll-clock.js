#!/usr/bin/env node
/**
 * AI Clock — anchor roller.
 * Advances clock.json's anchor date to today and rolls every scenario level
 * forward along its own growth curve, so the stored "as of" levels stay current
 * instead of ageing. Growth rates are left untouched — a human re-anchors those
 * (and sanity-checks the rolled levels) against fresh disclosures when reviewing
 * the PR this produces.
 *
 * Note: rolling along the existing curves is mathematically neutral for the live
 * clock (same projection) — its job is to keep the JSON honest and to prompt a
 * quarterly human re-anchor, not to invent new data.
 *
 * Exit codes: 0 = nothing to roll (anchor already current), 2 = rolled, 1 = error.
 */

const fs   = require('fs');
const path = require('path');

const CLOCK_PATH = path.join(__dirname, '../clock.json');
const YEAR_MS    = 365.25 * 86400 * 1000;

// scenario field  ->  matching growth-rate key
const RATE_FOR = {
  promptsPerDay:  'prompts',
  tokensPerYear:  'tokens',
  twhPerYear:     'energy',
  waterBLPerYear: 'water',
  spendPerYear:   'spend',
  co2MtPerYear:   'co2',
  capexPerYear:   'capex',
  usersNow:       'users',
  gpusNow:        'compute',
  frontierNow:    'frontier'
};

const sig3 = x => Number(x.toPrecision(3));

function main() {
  const clock = JSON.parse(fs.readFileSync(CLOCK_PATH, 'utf8'));
  const rates = clock.rates || {};
  const anchor = (clock._meta && clock._meta.anchor) || '2026-01-01';

  const anchorMs = Date.parse(anchor + 'T00:00:00Z');
  if (isNaN(anchorMs)) { console.error(`✗ Bad anchor date: "${anchor}"`); process.exit(1); }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMs  = Date.parse(todayStr + 'T00:00:00Z');
  const yrs = (todayMs - anchorMs) / YEAR_MS;

  if (yrs < 0.02) {  // less than ~1 week elapsed — nothing meaningful to roll
    console.log(`✓ Anchor is current (${anchor}); nothing to roll.`);
    process.exit(0);
  }

  for (const key of Object.keys(clock.scenarios || {})) {
    const sc = clock.scenarios[key];
    for (const field in RATE_FOR) {
      const g = rates[RATE_FOR[field]];
      if (typeof sc[field] === 'number' && typeof g === 'number') {
        sc[field] = sig3(sc[field] * Math.pow(g, yrs));
      }
    }
  }

  clock._meta = clock._meta || {};
  clock._meta.anchor = todayStr;
  clock._meta.last_rolled = todayStr;

  fs.writeFileSync(CLOCK_PATH, JSON.stringify(clock, null, 2) + '\n');
  console.log(`✓ Rolled anchor ${anchor} → ${todayStr} (+${yrs.toFixed(2)} yr along the curves).`);
  process.exit(2);
}

main();
