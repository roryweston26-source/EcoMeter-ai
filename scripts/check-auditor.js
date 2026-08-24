#!/usr/bin/env node
/**
 * Legerly — Subscription Auditor consistency check.
 *
 * audit.html is a SIXTH place a price lives, and check-prices.js never opens it.
 * On 2026-08-08 that gap had already cost us: the auditor's inline API fallback
 * still carried gemini-3.5-flash at $0.50/$3.00, the wrong figure corrected in
 * prices.json back on 2026-07-28 — so whenever the live fetch failed, the
 * auditor priced Gemini API usage at a THIRD of the real rate and biased its
 * advice toward "drop your plan and pay per token".
 *
 * The auditor's plan metadata is also a second, independent statement of the
 * same facts plan-limits.json records for pricing.html. Where two files in this
 * repo describe the same thing, they must agree or one of them is lying.
 *
 * Run after touching audit.html, prices.json or plan-limits.json:
 *   node scripts/check-auditor.js
 * Exits non-zero on any inconsistency, so it can gate CI.
 */
const fs = require('fs');
const R = require('path').join(__dirname, '..') + '/';
const html = fs.readFileSync(R + 'audit.html', 'utf8');
const p = JSON.parse(fs.readFileSync(R + 'extension/prices.json', 'utf8'));
const L = JSON.parse(fs.readFileSync(R + 'plan-limits.json', 'utf8'));
const side = fs.readFileSync(R + 'extension/sidepanel.js', 'utf8');

let bad = 0;
const fail = s => { console.log('  X ' + s); bad++; };

/* Pull a declaration out of audit.html and evaluate it. Anchored on the
   declaration that follows it, so reordering that block breaks this loudly
   rather than silently checking nothing. */
function block(startMarker, endMarker, name) {
  const i = html.indexOf(startMarker), j = html.indexOf(endMarker, i);
  if (i < 0 || j < 0) { fail('cannot locate ' + name + ' in audit.html (anchors moved?)'); return null; }
  try { return new Function(html.slice(i, j) + '\nreturn ' + name + ';')(); }
  catch (e) { fail('cannot evaluate ' + name + ': ' + e.message); return null; }
}

const PLANS  = block('let PLANS = {',   'let API = {',        'PLANS');
const API    = block('let API = {',     'const NAME',         'API');
const MODELS = block('const MODELS = {', 'const LEGACY_ONLY', 'MODELS');
if (!PLANS || !API || !MODELS) { console.log('\n' + bad + ' PROBLEM(S)'); process.exit(1); }

const all = {};
for (const prov in p.api) for (const k in p.api[prov]) all[k] = p.api[prov][k];
const subs = new Map(p.subscriptions.map(s => [s.p + '|' + s.m, s]));

/* 1. The inline API fallback must match prices.json exactly.
      A drift here only shows when the fetch fails, which is precisely why it
      rots unnoticed. */
for (const k in API) {
  const r = all[k];
  if (!r) { fail('API fallback prices a model absent from prices.json: ' + k); continue; }
  if (Math.abs(API[k].in - r.input) > 1e-12 || Math.abs(API[k].out - r.output) > 1e-12)
    fail('API fallback drift: ' + k + ' audit=$' + API[k].in * 1e6 + '/$' + API[k].out * 1e6 +
         ' vs prices.json=$' + r.input * 1e6 + '/$' + r.output * 1e6);
}

/* 2. Plan rows must join prices.json on p+m, and agree on price. The join is an
      exact string match, so a rename in one file silently orphans the other. */
for (const prov in PLANS) for (const t of PLANS[prov]) {
  const row = subs.get(prov + '|' + t.m);
  if (!row) { fail('plan not in prices.json subscriptions: ' + prov + ' / ' + t.m); continue; }
  if (Math.abs(row.price - t.price) > 1e-9)
    fail('plan price drift: ' + t.m + ' audit=$' + t.price + ' vs prices.json=$' + row.price);
  if (!L.plans.some(x => x.p === prov && x.m === t.m))
    fail('plan has no plan-limits.json entry (pricing.html and the auditor will disagree): ' + t.m);
}

/* 3. Every model the auditor gates on must be priceable, or apiCostPerMonth()
      returns null and the downgrade path silently stops being offered. */
for (const prov in PLANS) for (const t of PLANS[prov]) for (const k of t.models)
  if (!all[k]) fail('plan model has no API rate: ' + t.m + ' -> ' + k);

/* 4. The free tier's model list is OVERWRITTEN from prices.json free_tiers at
      runtime. If the inline copy disagrees, the auditor behaves differently
      online and offline — the worst kind of bug to reproduce. */
for (const prov in PLANS) {
  const free = PLANS[prov].slice().sort((a, b) => a.price - b.price)[0];
  if (!free || free.price !== 0) continue;
  const ft = ((p.free_tiers[prov] || {}).models || []).map(m => m.key);
  if (!ft.length) { fail('no free_tiers entry in prices.json for ' + prov); continue; }
  if (JSON.stringify(free.models) !== JSON.stringify(ft))
    fail('free-tier model drift for ' + prov + ': audit=[' + free.models + '] prices.json=[' + ft + ']');
}

/* 5. A pricier tier must never LOSE a model or shrink its cap. meetsNeeds()
      walks tiers cheapest-first and takes the first that fits; a non-monotonic
      ladder makes it fall through every tier to the "look at Team" dead end. */
for (const prov in PLANS) {
  const tiers = PLANS[prov].slice().sort((a, b) => a.price - b.price);
  for (let i = 1; i < tiers.length; i++) {
    const lost = tiers[i - 1].models.filter(m => !tiers[i].models.includes(m));
    if (lost.length) fail('tier ladder loses models going up: ' + prov + ' ' +
      tiers[i - 1].m + ' -> ' + tiers[i].m + ' drops [' + lost + ']');
    const lo = tiers[i - 1].cap, hi = tiers[i].cap;
    if (lo == null && hi != null) fail('tier ladder cap goes DOWN: ' + prov + ' ' +
      tiers[i - 1].m + ' (unlimited) -> ' + tiers[i].m + ' (' + hi + ')');
    if (lo != null && hi != null && hi < lo) fail('tier ladder cap goes DOWN: ' + prov + ' ' +
      tiers[i - 1].m + ' (' + lo + ') -> ' + tiers[i].m + ' (' + hi + ')');
  }
}

/* 6. Every cap must declare where it came from, and only 'disclosed' may claim
      the provider published it. plan-limits.json's finding is that exactly one
      absolute consumer cap is disclosed anywhere — the auditor must not quietly
      invent more. */
const PROV_OK = new Set(['disclosed', 'third_party', 'derived', 'estimate', 'not_disclosed']);
for (const prov in PLANS) for (const t of PLANS[prov]) {
  if (!PROV_OK.has(t.capSource)) fail('plan missing/invalid capSource: ' + t.m + ' -> ' + t.capSource);
  const lim = L.plans.find(x => x.p === prov && x.m === t.m) || {};
  if (t.capSource === 'disclosed' && t.cap != null && !(lim.caps && lim.caps.length))
    fail('cap claims "disclosed" but plan-limits.json publishes no absolute cap: ' + t.m);
  // A third-party figure may reach a tier through a provider-disclosed multiplier
  // (Anthropic's "5x Pro" over a base only outside trackers have estimated).
  if (t.capSource === 'third_party') {
    const base = lim.multiplier && L.plans.find(x => x.p === prov && x.m === lim.multiplier.of);
    const ok = (lim.third_party && lim.third_party.length) || (base && base.third_party && base.third_party.length);
    if (!ok) fail('cap claims "third_party" but neither this plan nor its multiplier base has one in plan-limits.json: ' + t.m);
  }
}

/* 7. MODELS[prov].free / .top drive the profile when there is no EcoMeter
      export. A key that no tier lists is invisible to the model gate, so the
      "I always want the best" answer would stop moving the recommendation. */
for (const prov in MODELS) {
  const tiers = PLANS[prov] || [];
  const known = new Set([].concat(...tiers.map(t => t.models)));
  for (const slot of ['free', 'top']) {
    const k = MODELS[prov][slot];
    if (!all[k]) fail('MODELS.' + prov + '.' + slot + ' has no API rate: ' + k);
    if (!known.has(k)) fail('MODELS.' + prov + '.' + slot + ' is in no ' + prov + ' tier: ' + k);
  }
  // If the best model is already free, the provider sells quota, not intelligence,
  // and `top` must be declared in TOP_IS_FREE — otherwise "I always want the best"
  // silently pushes people onto a paid plan that buys them no better model.
  const free = tiers.slice().sort((a, b) => a.price - b.price)[0];
  const declaredFree = new RegExp("TOP_IS_FREE = new Set\\(\\[[^\\]]*'" + prov + "'").test(html);
  const topIsFree = free && free.models.includes(MODELS[prov].top);
  if (topIsFree && !declaredFree)
    fail('MODELS.' + prov + '.top is on the FREE tier but ' + prov + ' is not in TOP_IS_FREE: ' + MODELS[prov].top);
  if (!topIsFree && declaredFree)
    fail(prov + ' is in TOP_IS_FREE but its top model is not on the free tier: ' + MODELS[prov].top);
}

/* 8. The "what do you pay for today?" options must resolve to real tiers, or
      the over-payment comparison silently vanishes for that plan. */
const pays = [...html.matchAll(/\{v:'(\w+)::([^']+)',label:/g)];
if (!pays.length) fail('could not find any prov::plan options in the pays question');
for (const [, prov, name] of pays)
  if (!(PLANS[prov] || []).some(t => t.m === name)) fail('pays option matches no tier: ' + prov + '::' + name);

/* 9. pricing.html carries its OWN inline snapshot of plan-limits.json, so the
      Break even / Ceiling columns can differ depending on whether the live fetch
      succeeded — the same failure mode as FALLBACK_PRICES in 2026-07. Provenance
      and caps are what those columns render, so they must agree. */
const pricing = fs.readFileSync(R + 'pricing.html', 'utf8');
const fbStart = pricing.indexOf('var FALLBACK_LIMITS'), fbEnd = pricing.indexOf('var LIMITS_STATE');
const fbBlock = fbEnd > fbStart ? pricing.slice(fbStart, fbEnd) : pricing.slice(fbStart, fbStart + 6000);
for (const m of fbBlock.matchAll(/\{\s*p:"(\w+)",\s*m:"([^"]+)",\s*provenance:"(\w+)"([\s\S]*?)\},?\s*(?=\{\s*p:"|\]\s*\};)/g)) {
  const [, prov, name, provenance, rest] = m;
  const lim = L.plans.find(x => x.p === prov && x.m === name);
  if (!lim) { fail('pricing.html fallback has a plan absent from plan-limits.json: ' + name); continue; }
  if (lim.provenance !== provenance)
    fail('pricing.html fallback provenance drift: ' + name + ' inline="' + provenance + '" vs plan-limits.json="' + lim.provenance + '"');
  const inlineCap = /caps:\s*\[/.test(rest), fileCap = !!(lim.caps && lim.caps.length);
  if (inlineCap !== fileCap)
    fail('pricing.html fallback caps mismatch: ' + name + (fileCap ? ' (inline is missing them)' : ' (inline has caps the file does not)'));
  if (inlineCap && fileCap) {
    const n = rest.match(/n:\s*(\d+)/), win = rest.match(/window:\s*"([^"]+)"/);
    if (!n || +n[1] !== lim.caps[0].n || !win || win[1] !== lim.caps[0].window)
      fail('pricing.html fallback cap figure drift: ' + name);
    if (/scope_limited:\s*true/.test(rest) !== !!lim.caps[0].scope_limited)
      fail('pricing.html fallback scope_limited drift: ' + name);
  }
}

/* 9b. audit.html's inline ARCHETYPE is a fallback for a failed plan-limits fetch.
       It is the tokens-per-message assumption behind every dollar figure on both
       pages, so a drift here means the Auditor and the pricing table quietly
       disagree about what a message costs whenever the fetch fails. */
const arcBlock = html.slice(html.indexOf('const ARCHETYPE='), html.indexOf('const PURPOSE_TOK='));
const arcSeen = new Set();
for (const m of arcBlock.matchAll(/(\w+):\s*\{in:(\d+),\s*out:(\d+)\}/g)) {
  const [, name, i, o] = m;
  arcSeen.add(name);
  const ref = (L._meta.archetypes || {})[name];
  if (!ref) { fail('audit.html has an archetype plan-limits.json does not: ' + name); continue; }
  if (+i !== ref.input || +o !== ref.output)
    fail('archetype drift: ' + name + ' audit=' + i + '/' + o + ' vs plan-limits.json=' + ref.input + '/' + ref.output);
}
// _meta.archetypes also carries a prose `comment` key — only real archetypes count.
for (const [name, v] of Object.entries(L._meta.archetypes || {}))
  if (v && typeof v.input === 'number' && !arcSeen.has(name))
    fail('plan-limits.json archetype missing from audit.html fallback: ' + name);

/* 9c. Every value_model for an audited provider must have a display label, or its
       raw key ("claude-haiku-4-5-20251001") is shown to the reader in the
       break-even line. */
const labelBlock = html.slice(html.indexOf('const LABELS = {'), html.indexOf('const labelModel'));
const labelled = new Set([...labelBlock.matchAll(/'([\w.\-]+)'\s*:/g)].map(m => m[1]));
for (const plan of L.plans) {
  if (!PLANS[plan.p] || !plan.value_models) continue;
  for (const k of ['low', 'high']) {
    const key = plan.value_models[k];
    if (key && !labelled.has(key))
      fail('value_model has no display label, so its raw key would be shown: ' + plan.m + ' -> ' + key);
  }
}

/* 10. student-access.json. Every route makes a claim about a real company's
       offer, so each needs a provenance we recognise and a date it was checked.
       Anything stated as fact ('disclosed') must carry a provider-owned source —
       the whole point of the file is that the blogs on this subject are wrong. */
const S = JSON.parse(fs.readFileSync(R + 'student-access.json', 'utf8'));
const ROUTE_PROV = new Set(['disclosed', 'institutional', 'unverified', 'paused', 'none']);
const seenP = new Set();
for (const r of S.routes) {
  if (!ROUTE_PROV.has(r.provenance)) fail('student route has unknown provenance: ' + r.p + ' -> ' + r.provenance);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.as_of || '')) fail('student route missing as_of date: ' + r.p);
  if (!r.headline || !r.detail) fail('student route missing headline/detail: ' + r.p);
  if (r.provenance === 'disclosed' && !r.source)
    fail('student route claims "disclosed" with no source — that is exactly the claim that needs one: ' + r.p);
  if (!p.subscriptions.some(s => s.p === r.p)) fail('student route for a provider absent from prices.json: ' + r.p);
  if (seenP.has(r.p)) fail('duplicate student route for provider: ' + r.p);
  seenP.add(r.p);
  // A route for a provider the Auditor audits must be reachable: the panel only
  // renders rows for tools the user picked, plus 'disclosed' offers elsewhere.
  if (!PLANS[r.p] && r.provenance !== 'disclosed' && !r.not_audited)
    fail('student route can never render (provider not audited, offer not disclosed): ' + r.p);
}
// The partner list must stay flagged as examples. Rendering it as a directory
// would tell a student at an unlisted school they cannot get access.
if (S.partner_institutions && S.partner_institutions.not_exhaustive !== true)
  fail('partner_institutions must set not_exhaustive:true — no provider publishes a complete list');
const audit_ns = /not a directory/i.test(html) || /examples, not a directory/i.test(html);
if (S.partner_institutions && !audit_ns)
  fail('audit.html renders partner_institutions without saying it is not a directory');

/* 11. Anything the extension can put in an export must be understood here. A
       catalog key the auditor cannot price is a model a real user ran that the
       recommendation quietly ignores. */
const cat = side.slice(side.indexOf('const MODEL_CATALOG'), side.indexOf('for (const grp of MODEL_CATALOG'));
for (const m of cat.matchAll(/key:'([^']+)'/g))
  if (!all[m[1]]) fail('extension can export a model the auditor cannot price: ' + m[1]);

console.log(bad
  ? '\n' + bad + ' PROBLEM(S)'
  : 'AUDITOR CHECKS PASS — ' + Object.keys(PLANS).length + ' providers, ' +
    Object.values(PLANS).reduce((n, t) => n + t.length, 0) + ' tiers, ' +
    Object.keys(API).length + ' fallback rates, ' + pays.length + ' current-plan options');
process.exit(bad ? 1 : 0);
