#!/usr/bin/env node
/*
 * Re-checks the OpenRouter block in plan-limits.json → _meta.openrouter against
 * OpenRouter's public model API. Dev tool only: the site never calls OpenRouter.
 *
 * For every model a plan's break-even is priced on (value_models), it asks one
 * question: does OpenRouter route this model to its OWN maker at the same rate
 * prices.json carries? That is what lets the "show the math" panel say "same rate,
 * plus the credit fee" without storing a second rate card that could drift.
 *
 * Third-party hosts are deliberately ignored. They are often far cheaper for
 * open-weight models but run at different precisions (int4→bf16), so they are not
 * the same computation — see FRESHNESS A9 and prices.json `hosted`.
 *
 * Usage: node scripts/verify-openrouter.js          report only
 *        node scripts/verify-openrouter.js --print  also print a models block to paste
 */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..') + '/';

// Our provider key → OpenRouter's provider_name for the first-party endpoint.
const FIRST_PARTY = {
  openai: ['OpenAI'], anthropic: ['Anthropic'], google: ['Google AI Studio', 'Google'],
  xai: ['xAI'], mistral: ['Mistral'], deepseek: ['DeepSeek'], zai: ['Z.AI'],
  perplexity: ['Perplexity'], alibaba: ['Alibaba'], moonshot: ['Moonshot AI'],
};
// Our provider key → OpenRouter's author slug.
const AUTHOR = { openai: 'openai', anthropic: 'anthropic', google: 'google', xai: 'x-ai',
  mistral: 'mistralai', deepseek: 'deepseek', zai: 'z-ai', alibaba: 'qwen', moonshot: 'moonshotai' };

const close = (a, b) => Math.abs(a - b) <= Math.max(a, b) * 0.005;
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

async function getJSON(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'legerly-verify/1.0' } });
  if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
  return r.json();
}

(async () => {
  const P = JSON.parse(fs.readFileSync(R + 'extension/prices.json', 'utf8'));
  const L = JSON.parse(fs.readFileSync(R + 'plan-limits.json', 'utf8'));
  const list = (await getJSON('https://openrouter.ai/api/v1/models')).data;

  const keys = new Set();
  for (const pl of L.plans)
    for (const k of Object.values(pl.value_models || {}))
      keys.add(k.includes(':') ? k : pl.p + ':' + k);

  const out = {};
  let bad = 0;
  for (const key of [...keys].sort()) {
    const [prov, model] = key.split(':');
    const ours = (P.api[prov] || {})[model];
    // Exact id match first; Anthropic's dated Haiku key drops the date on OpenRouter.
    const want = norm(model.replace(/-\d{8}$/, ''));
    // Fallback on the display name: Mistral lists Small 4 under a dated id (mistral-small-2603).
    const mine = list.filter(m => m.id.split('/')[0] === AUTHOR[prov] && !m.id.includes(':'));
    const hit = mine.find(m => norm(m.id.split('/')[1]) === want) ||
                mine.find(m => norm(String(m.name).split(':').pop()) === want);
    if (!ours || !hit) {
      out[key] = null;
      console.log('  -  ' + key.padEnd(38) + (ours ? 'not on OpenRouter' : 'not in prices.json'));
      continue;
    }
    const eps = ((await getJSON('https://openrouter.ai/api/v1/models/' + hit.id + '/endpoints')).data || {}).endpoints || [];
    const fp = eps.filter(e => (FIRST_PARTY[prov] || []).includes(e.provider_name));
    const same = fp.find(e => close(+e.pricing.prompt, ours.input) && close(+e.pricing.completion, ours.output));
    if (same) {
      out[key] = hit.id;
      console.log('  ✓  ' + key.padEnd(38) + hit.id + ' via ' + same.provider_name + ', same rate');
    } else {
      out[key] = null; if (fp.length) bad++;
      console.log('  ✗  ' + key.padEnd(38) + hit.id + ': ' + (fp.length
        ? 'first-party endpoint at ' + fp.map(e => '$' + (e.pricing.prompt * 1e6).toFixed(2) + '/$' + (e.pricing.completion * 1e6).toFixed(2)).join(', ') + ', ours $' + (ours.input * 1e6).toFixed(2) + '/$' + (ours.output * 1e6).toFixed(2)
        : 'no first-party endpoint (third-party hosts only)'));
    }
  }

  const cur = (L._meta.openrouter || {}).models || {};
  const drift = Object.keys({ ...cur, ...out }).filter(k => cur[k] !== out[k]);
  console.log(drift.length ? '\nDIFFERS from plan-limits.json: ' + drift.join(', ') : '\nplan-limits.json _meta.openrouter.models is current.');
  if (bad) console.log(bad + ' model(s) have a first-party endpoint at a different rate: re-read prices.json before trusting either.');

  // Prints rather than writes: re-serialising plan-limits.json reformats the whole file.
  if (process.argv.includes('--print'))
    console.log('\n"models": ' + JSON.stringify(out, null, 2).replace(/\n/g, '\n      '));
})().catch(e => { console.error(e.message); process.exit(1); });
