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
let warned = 0;
const warn = s => { console.log('  ! ' + s); warned++; };

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

/* 8. The "what do you pay for today?" options, both directions.
      Resolving to a real tier was always checked. What was NOT checked was the
      inverse — that every paid tier is actually offerable — and four of the ten
      were missing: ChatGPT Go, Claude Max 20x, Google AI Plus and Google AI Ultra.
      Max 20x was the expensive one: a $200/mo payer had to pick "Claude Max",
      which resolved to Max 5x at $100, so the saving we quoted was $100/mo too
      small. That is this tool's headline number, wrong, on the largest
      overpayment it exists to catch.
      The list is derived from PLANS now, so the completeness is structural — what
      this guards is that nobody quietly goes back to hand-typing it. */
const aliasSrc = html.match(/const PLAN_ALIAS = \{[^}]*\};/);
const paySrc   = html.match(/function payOptions\(\)\{[\s\S]*?\n\}/);
const moneySrc = html.match(/const money = n => \{[\s\S]*?\};/);
let pays = [];
if (!/options:payOptions/.test(html))
  fail('the pays question no longer uses the derived payOptions list');
if (/\{v:'\w+::[^']+',label:/.test(html))
  fail('a hand-written prov::plan option is back in audit.html — derive it from PLANS instead');
if (!aliasSrc || !paySrc || !moneySrc) fail('cannot locate payOptions / PLAN_ALIAS / money (anchors moved?)');
else {
  try {
    pays = new Function('PLANS', moneySrc[0] + '\n' + aliasSrc[0] + '\n' + paySrc[0] + '\nreturn payOptions();')(PLANS);
  } catch (e) { fail('cannot evaluate payOptions: ' + e.message); }
}
{
  const vals = new Set(pays.map(o => o.v));
  if (!vals.has('none')) fail('the pays question lost its "Nothing" option');
  if (!vals.has('api'))  fail('the pays question lost its API / pay-as-you-go option');
  for (const o of pays) {
    if (o.v === 'none' || o.v === 'api') continue;
    const [prov, name] = o.v.split('::');
    if (!(PLANS[prov] || []).some(t => t.m === name)) fail('pays option matches no tier: ' + o.v);
  }
  for (const prov in PLANS) for (const t of PLANS[prov]) {
    if (t.price <= 0) continue;
    if (!vals.has(prov + '::' + t.m))
      fail('paid tier is not selectable in "what do you pay for today?": ' + prov + '::' + t.m
         + ' — anyone on it gets no over-payment comparison at all');
    const opt = pays.find(o => o.v === prov + '::' + t.m);
    if (opt && !opt.label.includes(String(t.price)))
      fail('pays option does not show its price, so nobody can match their bill to it: ' + opt.v);
  }
  // A rename alias that names no real tier is a label pointing at nothing.
  if (aliasSrc) for (const m of aliasSrc[0].matchAll(/'([^']+)':/g))
    if (!Object.values(PLANS).some(ts => ts.some(t => t.m === m[1])))
      fail('PLAN_ALIAS names a tier that does not exist: ' + m[1]);
}

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

/* 9d. A BREAK-EVEN PRICED OFF A MODEL THE PLAN DOES NOT CARRY IS A WRONG NUMBER,
       and until 2026-08-26 five of them were: every Gemini value_models pair still
       named gemini-3.5-flash and two Flash-Lites, months after prices.json and the
       tier model lists had moved to gemini-3.6-flash. The figures were internally
       consistent and externally false — Google AI Pro read "break even at 47-63
       messages a day" when on the models that plan actually serves it is 48-137,
       and the error ran in the direction that flatters the subscription. The two
       files are re-verified on different days, so nothing but this join notices.
       Only checks audited providers: the others have no tier model list to join to. */
for (const plan of L.plans) {
  const tier = (PLANS[plan.p] || []).find(x => x.m === plan.m);
  if (!tier || !plan.value_models) continue;
  for (const k of ['low', 'high']) {
    const key = plan.value_models[k];
    if (key && !tier.models.includes(key))
      fail('break-even for ' + plan.p + ' / ' + plan.m + ' is priced on ' + key
         + ', which that tier does not carry (it has: ' + tier.models.join(', ') + ')');
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

/* 10b. A ROUTE'S as_of HAS A SHELF LIFE, and until now nothing measured it. The file
        has said since 2026-08-08 to "treat anything older than a month or two as
        needing a re-check", and that rule living only in prose is what cost us the
        Google year: recorded 'none' on 2026-08-08, correct that day, still being
        served to students on 2026-08-24 while a free ~$240 sat on Google's own site.
        The claim_by guard below cannot catch that shape, because a route that says
        'no offer exists' has no deadline to expire. Age is the only signal there is.
        Warn at 30 days, fail at 60 — the deadline rows fail hard because an expired
        date is a fact, whereas "this is getting old" is a judgement, and a solo
        project should not have its deploys blocked the day after the warning. A
        verified absence rotted in 16 days once, so these are deliberately tight. */
const DAY = 864e5, ageOf = d => Math.floor((Date.now() - new Date(d + 'T00:00:00Z').getTime()) / DAY);
const STALE_WARN = 30, STALE_FAIL = 60;
for (const r of S.routes) {
  const age = ageOf(r.as_of);
  const what = 'student route ' + r.p + ' was last verified ' + age + ' days ago (' + r.as_of + ')';
  if (age >= STALE_FAIL) fail(what + ' — re-verify it against the page it came from. A verified ABSENCE expires too: re-check the "none" and "paused" rows as hard as the live ones.');
  else if (age >= STALE_WARN) warn(what + ' — due a re-check.');
}
if (S._meta && S._meta.last_verified && ageOf(S._meta.last_verified) >= STALE_FAIL)
  fail('student-access.json _meta.last_verified is ' + ageOf(S._meta.last_verified) + ' days old');

/* 11b. LEGACY_MODELS is subtracted from the "does this person need frontier
        models" signal, because a model can be paid-only for being OLD rather than
        good — OpenAI's single "Legacy models" row (Free: No, Go: No) is exactly
        that. The risk of the list is the opposite one: park a genuinely frontier
        model in here and the engine stops noticing that its user wants frontier
        capability. So every entry must (a) be a real priced model and (b) actually
        be gated behind a paid tier — if it is on a free tier, it was never in the
        advanced set and listing it here is misleading noise. */
const legacyBlock = html.match(/const LEGACY_MODELS = new Set\(\[([^\]]*)\]\)/);
if (!legacyBlock) fail('cannot locate LEGACY_MODELS in audit.html (anchor moved?)');
else {
  const keys = [...legacyBlock[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  if (!keys.length) fail('LEGACY_MODELS is empty — remove it or populate it');

  // Rebuild the set advancedModels() derives BEFORE the subtraction, by the same
  // rule: per-provider free tier, but one shared output set. That sharing matters
  // here — GPT-5.5 is on Copilot's free tier and still lands in the advanced set
  // because OpenAI gates it, so "is it free somewhere" is the wrong question. The
  // only question worth asking is whether the subtraction actually removes it.
  const preSubtraction = new Set();
  for (const tiers of Object.values(PLANS)) {
    const sorted = tiers.slice().sort((a, b) => a.price - b.price);
    const free = new Set(sorted[0].price === 0 ? sorted[0].models : []);
    sorted.forEach(t => { if (t.price > 0) t.models.forEach(m => { if (!free.has(m)) preSubtraction.add(m); }); });
  }
  const extras = html.match(/\n\s*\[([^\]]*)\]\.forEach\(m=>s\.add\(m\)\)/);
  if (extras) for (const m of extras[1].matchAll(/'([^']+)'/g)) preSubtraction.add(m[1]);

  for (const k of keys) {
    if (!all[k]) { fail('LEGACY_MODELS names a model with no API rate: ' + k); continue; }
    if (!preSubtraction.has(k))
      fail('LEGACY_MODELS lists ' + k + ', which never enters the advanced set — the subtraction is a no-op, so remove it');
  }
}

/* 11. Anything the extension can put in an export must be understood here. A
       catalog key the auditor cannot price is a model a real user ran that the
       recommendation quietly ignores. */
const cat = side.slice(side.indexOf('const MODEL_CATALOG'), side.indexOf('for (const grp of MODEL_CATALOG'));
for (const m of cat.matchAll(/key:'([^']+)'/g))
  if (!all[m[1]]) fail('extension can export a model the auditor cannot price: ' + m[1]);

/* 12. Every `features` string must have a display label. These strings were inert
       for months: only image-gen and video-gen gate a recommendation, so the rest
       were collected and shown to nobody. The "a specific feature" answer renders
       them now, and an unlabelled feature would either vanish from that answer or
       leak a raw key like 'sol-pro' at the reader. */
const FEATURE_LABELS = block('const FEATURE_LABELS = {', 'const ACTIVE_DAYS', 'FEATURE_LABELS');
if (FEATURE_LABELS) for (const prov in PLANS) for (const t of PLANS[prov]) for (const f of t.features)
  if (!FEATURE_LABELS[f]) fail('PLANS uses a feature with no FEATURE_LABELS entry: ' + f + ' (on ' + t.m + ')');

/* 13. The privacy answer joins transparency-index.json by COMPANY display name,
       because that file has no provider key. That is the join this repo keeps
       getting burned by, so assert both directions resolve. */
{
  const TI = JSON.parse(fs.readFileSync(R + 'transparency-index.json', 'utf8'));
  const rows = (TI.data_practices && TI.data_practices.rows) || [];
  const PRACTICE_ROW = block('const PRACTICE_ROW = {', '/* Plan limits', 'PRACTICE_ROW');
  if (!rows.length) fail('transparency-index.json has no data_practices rows for the privacy answer to read');
  if (PRACTICE_ROW) {
    for (const prov in PLANS)
      if (!PRACTICE_ROW[prov]) fail('no PRACTICE_ROW mapping for audited provider: ' + prov);
    for (const prov in PRACTICE_ROW)
      if (!rows.some(r => r.provider === PRACTICE_ROW[prov]))
        fail('PRACTICE_ROW points at a company with no data_practices row: ' + PRACTICE_ROW[prov]);
    // The two cells the answer actually renders.
    for (const prov in PRACTICE_ROW) {
      const row = rows.find(r => r.provider === PRACTICE_ROW[prov]);
      if (row) for (const k of ['training_default', 'optout'])
        if (!row.cells || !row.cells[k]) fail('data_practices row ' + row.provider + ' is missing the ' + k + ' cell');
    }
  }
}

/* 14. The frontier question must not promise an upgrade the engine refuses. It
       used to name Gemini 3.1 Pro as an example of a model worth paying for, while
       TOP_IS_FREE deliberately makes that answer a no-op for Google. The examples
       are derived now; the hand-written half is the help text listing which
       providers gate on quota, and THAT can drift. */
{
  const TOP_IS_FREE = block('const TOP_IS_FREE = new Set(', 'const LEGACY_ONLY', 'TOP_IS_FREE');
  const NAME = block('const NAME   = {', 'const MODELS', 'NAME');
  const qm = html.match(/\{id:'frontier'[\s\S]*?\]\},/);
  if (!qm) fail('cannot locate the frontier question in audit.html (anchor moved?)');
  else if (TOP_IS_FREE && NAME) {
    if (!/frontierExamples\(\)/.test(qm[0]))
      fail('the frontier question hand-types its model examples again — derive them from MODELS');
    const helpM = qm[0].match(/help:'([^']*)'/);
    for (const prov in NAME) {
      const named = helpM && helpM[1].includes(NAME[prov]);
      if (TOP_IS_FREE.has(prov) && !named)
        fail('frontier help does not tell the reader ' + NAME[prov] + ' gates on quota, so the answer looks like it does something there');
      if (!TOP_IS_FREE.has(prov) && named && new RegExp(NAME[prov] + '[^.]*same models').test(helpM[1]))
        fail('frontier help lists ' + NAME[prov] + ' as running the same models on every tier, but it is not in TOP_IS_FREE');
    }
  }
}

/* 15. The student help text must carry no hand-typed month, year or count. It used
       to read "as of August 2026 three of them are ... claimed by 31 Dec 2026":
       a month that expired by itself, a count copied out of the data, and a
       deadline that would have gone on advertising a dead offer in the present
       tense — the exact failure this file's own caveats warn about. */
{
  const sh = html.match(/function studentHelp\(\)\{[\s\S]*?\n\}/);
  if (!sh) fail('cannot locate studentHelp() in audit.html (anchor moved?)');
  else {
    const months = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
    if (months.test(sh[0])) fail('studentHelp() hand-types a month name — compose it from student-access.json');
    if (/\b20\d\d\b/.test(sh[0])) fail('studentHelp() hand-types a year — compose it from student-access.json');
    if (/\b(one|two|three|four|five|six|seven|eight)\b of the\b/i.test(sh[0]))
      fail('studentHelp() hand-types a count of offers — count the routes instead');
  }
}

/* 16. A claimable offer with a deadline must carry it as a FIELD, and the deadline
       must not have passed. Same idea as check-prices.js on promo.until: a date
       living only in prose is a date nothing can check, and student-access.json's
       own rule is to ask "what is the redemption deadline, and has it passed". */
for (const r of S.routes) {
  if (r.claim_by == null && r.claim_label == null) continue;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.claim_by || ''))
    fail('student route has a claim_label but no valid claim_by date: ' + r.p);
  else if (new Date(r.claim_by + 'T23:59:59Z').getTime() < Date.now())
    fail('student route ' + r.p + ' has a claim_by that has PASSED (' + r.claim_by
       + ') — re-verify the offer and either update the date or drop the route to "none"');
  if (!r.claim_label) fail('student route has a claim_by but no claim_label to name it: ' + r.p);
}

/* 17. The Auditor tells people which buttons to press in the extension. It named
       a "Usage" control that has never existed: the real path is the "Usage &
       accuracy" panel, then "Export for Auditor", and that button is hidden until
       usage tracking is switched on. Read the labels out of the extension so the
       instruction cannot drift from the product again. */
{
  const panel = fs.readFileSync(R + 'extension/sidepanel.html', 'utf8');
  const btn = (panel.match(/id="export-btn"[^>]*>([^<]+)</) || [])[1];
  const sum = (panel.match(/<details class="usage-panel"[\s\S]{0,200}?<summary>([^<]+)<\/summary>/) || [])[1];
  if (!btn) fail('cannot find the export button label in extension/sidepanel.html (anchor moved?)');
  else if (!html.includes(btn.trim()))
    fail('audit.html does not name the real export button: extension says "' + btn.trim() + '"');
  if (!sum) fail('cannot find the usage panel summary in extension/sidepanel.html (anchor moved?)');
  else if (!html.includes(sum.trim()))
    fail('audit.html does not name the real usage panel: extension says "' + sum.trim() + '"');
  if (!/only appears once tracking is on|switch on usage tracking/i.test(html))
    fail('audit.html does not tell the reader the export button is hidden until tracking is on');
}

console.log(bad
  ? '\n' + bad + ' PROBLEM(S)' + (warned ? ' and ' + warned + ' warning(s)' : '')
  : 'AUDITOR CHECKS PASS — ' + Object.keys(PLANS).length + ' providers, ' +
    Object.values(PLANS).reduce((n, t) => n + t.length, 0) + ' tiers, ' +
    Object.keys(API).length + ' fallback rates, ' + pays.length + ' current-plan options' + (warned ? ' — with ' + warned + ' staleness warning(s) above' : ''));
process.exit(bad ? 1 : 0);
