#!/usr/bin/env node
/**
 * Legerly — Subscription Auditor behaviour tests.
 *
 * check-auditor.js checks the DATA is consistent. This checks the ENGINE actually
 * recommends the right plan, by sweeping every combination of quiz answers and
 * asserting invariants, then exercising the EcoMeter import path.
 *
 * It found a real bug on the first run: the volume-aware downgrade kept its own
 * copy of "does this tier clear your needs" which never got the image-generation
 * gate, so 450 combinations told people who generate images regularly to drop to
 * a free tier that throttles it. Reading the code did not reveal that; sweeping
 * the space did.
 *
 * Zero dependencies. Loads the real audit.html and the real JSON, so it fails if
 * the page or the data drifts.  Run:  node scripts/test-auditor.js
 */
const fs = require('fs');
const R = require('path').join(__dirname, '..') + '/';

/* ---------- load the page's engine with a minimal DOM ---------- */
const html = fs.readFileSync(R + 'audit.html', 'utf8');
const src = html.slice(html.indexOf('<script>') + '<script>'.length, html.lastIndexOf('</script>'));

const stubEl = () => ({
  innerHTML: '', textContent: '', className: '', dataset: {}, files: null, offsetTop: 0, open: false,
  classList: { add() {}, remove() {}, contains() { return false; } },
  addEventListener() {}, click() {}, scrollIntoView() {},
  querySelector() { return stubEl(); }, querySelectorAll() { return []; }
});
const documentStub = { getElementById: stubEl, querySelector: stubEl, querySelectorAll: () => [] };
const windowStub = { scrollTo() {} };
const FILES = { '/extension/prices.json': 'extension/prices.json', '/student-access.json': 'student-access.json' };
const fetchStub = url => {
  const f = FILES[String(url).split('?')[0]];
  if (!f) return Promise.resolve({ ok: false });
  return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(R + f, 'utf8'))) });
};
function FileReaderStub() {}

const EXPORTS = ['PLANS', 'API', 'MODELS', 'NAME', 'TOP_IS_FREE', 'LEGACY_ONLY', 'state',
  'recommend', 'profileFor', 'meetsNeeds', 'clearsNonModelNeeds', 'apiCostPerMonth',
  'currentPlans', 'classify', 'applyEcometer', 'limitsFactor', 'advancedModels'];
const A = new Function('document', 'window', 'fetch', 'FileReader',
  src + '\nreturn {' + EXPORTS.join(',') + '};')(documentStub, windowStub, fetchStub, FileReaderStub);

let bad = 0, ran = 0;
const ok = (name, cond, detail) => {
  ran++;
  if (cond) return;
  bad++;
  console.log('  X ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : ''));
};

/* ---------- helpers mirroring how finish() builds its inputs ---------- */
const sigFor = a => ({
  hits_limits: a.limits, media: a.media, media_generation: a.media !== 'no',
  team: a.team === 'team', current_plans: A.currentPlans(a), priority: a.priority
});
const sorted = prov => A.PLANS[prov].slice().sort((x, y) => x.price - y.price);
const tierByName = (prov, nm) => A.PLANS[prov].find(t => t.m === nm);

// What did recommend() actually tell the user to do, and what does it cost?
function parse(prov, r) {
  const tiers = sorted(prov);
  if (/Team plan/.test(r.head)) return { kind: 'team', cost: Infinity };
  if (/pay-as-you-go/.test(r.head)) {
    const base = /Drop to free/.test(r.head) ? tiers[0]
      : tierByName(prov, (r.head.match(/^(.+?) \+ pay-as-you-go/) || [])[1]);
    const m = r.why.join(' ').match(/~\$([\d.]+)\/mo/);
    return { kind: 'hybrid', tier: base, cost: base ? base.price + (m ? parseFloat(m[1]) : 0) : NaN };
  }
  if (/Stay on the free/.test(r.head)) return { kind: 'tier', tier: tiers[0], cost: 0 };
  const m = r.head.match(/^(.+?) — \$/);
  const tier = m && tierByName(prov, m[1]);
  return { kind: 'tier', tier, cost: tier ? tier.price : NaN };
}

async function main() {
  await new Promise(r => setImmediate(r));   // let the prices.json fetch land

  /* ---------- 0. live data actually loaded ---------- */
  ok('prices.json fetched into API (not just the inline fallback)', !!A.API['gemini-3.6-flash']);
  ok('subscription prices synced', tierByName('google', 'Google AI Plus').price === 4.99);

  /* ---------- 1. full sweep of the answer space ---------- */
  const MSG = ['lt5', '5to20', '20to50', '50to150', '150plus'],
        FREQ = ['rarely', 'fewWeek', 'mostDays', 'manyDay', 'constant'],
        PUR = ['quick', 'writing', 'research', 'coding', 'agentic'],
        LIM = ['never', 'rarely', 'sometimes', 'often', 'constant'],
        FRO = ['default', 'sometimes', 'always'], MED = ['no', 'occ', 'regular'], TEAM = ['solo', 'team'];
  const problems = {};
  const note = (t, extra) => { problems[t] = problems[t] || { n: 0, first: extra }; problems[t].n++; };
  let combos = 0;

  for (const prov of Object.keys(A.PLANS)) {
    const tiers = sorted(prov);
    for (const messages of MSG) for (const frequency of FREQ) for (const purpose of PUR)
    for (const limits of LIM) for (const frontier of FRO) for (const media of MED) for (const team of TEAM) {
      const a = { tools: [prov], messages, frequency, purpose, limits, frontier, media, team,
                  pays: ['none'], priority: 'cost', student: 'no' };
      const sig = sigFor(a);
      combos++;
      let pf, r;
      try { pf = A.profileFor(prov, a, sig); r = A.recommend(pf, sig); }
      catch (e) { note('THREW', { prov, a, e: String(e) }); continue; }
      if (!r || !r.head || !Array.isArray(r.why) || !r.why.length) { note('EMPTY_RESULT', { prov, a }); continue; }

      const got = parse(prov, r);
      if (got.kind === 'team') {
        if (tiers.some(t => A.meetsNeeds(t, pf, sig))) note('TEAM_DEADEND_BUT_A_TIER_FITS', { prov, a });
        continue;
      }
      if (!got.tier) { note('UNPARSEABLE_HEAD', { prov, head: r.head }); continue; }

      if (got.kind === 'tier') {
        // must satisfy everything, and be the cheapest that does
        if (!A.meetsNeeds(got.tier, pf, sig)) note('RECOMMENDED_TIER_DOES_NOT_MEET_NEEDS', { prov, a, head: r.head });
        if (tiers.some(t => t.price < got.tier.price && A.meetsNeeds(t, pf, sig)))
          note('NOT_THE_CHEAPEST_TIER_THAT_FITS', { prov, a, head: r.head });
      } else {
        // the downgrade offloads MODELS to the API — it may not offload volume,
        // seats or image generation, and it must genuinely be cheaper
        if (!A.clearsNonModelNeeds(got.tier, pf, sig))
          note('DOWNGRADE_BASE_FAILS_VOLUME_SEATS_OR_MEDIA', { prov, a, head: r.head });
        const fit = tiers.find(t => A.meetsNeeds(t, pf, sig));
        if (fit && got.cost >= fit.price + 1e-9) note('DOWNGRADE_NOT_ACTUALLY_CHEAPER', { prov, a, head: r.head });
      }
    }

    // more usage must never cost less
    for (const purpose of PUR) for (const frontier of FRO) for (const media of MED) {
      let prev = -1;
      for (const messages of MSG) {
        const a = { tools: [prov], messages, frequency: 'mostDays', purpose, limits: 'never',
                    frontier, media, team: 'solo', pays: ['none'], priority: 'cost', student: 'no' };
        const sig = sigFor(a);
        const cost = parse(prov, A.recommend(A.profileFor(prov, a, sig), sig)).cost;
        if (cost < prev - 1e-9) note('MORE_VOLUME_COSTS_LESS', { prov, purpose, frontier, media, messages, cost, prev });
        prev = cost;
      }
    }
  }
  for (const t of Object.keys(problems)) ok('sweep: ' + t, false, problems[t]);
  ok('swept every answer combination with no invariant broken', Object.keys(problems).length === 0,
     { combos, kinds: Object.keys(problems) });

  /* ---------- 2. over/under-payment detection ---------- */
  {
    const a = { tools: ['openai'], messages: '5to20', frequency: 'mostDays', purpose: 'writing', limits: 'never',
                frontier: 'default', media: 'no', team: 'solo', pays: ['openai::ChatGPT Plus'], priority: 'cost', student: 'no' };
    const sig = sigFor(a);
    const r = A.recommend(A.profileFor('openai', a, sig), sig);
    const save = r.why.find(w => typeof w === 'object' && /saves/.test(w.html));
    ok('spots overpayment against a plan the user says they buy', !!save, r.why);
    ok('saving is priced off the real plan price', !!save && /\$20/.test(save.html), save && save.html);
  }

  /* ---------- 3. EcoMeter import ---------- */
  const load = log => { A.state.i = 0; A.state.answers = {}; A.applyEcometer(log); };
  const withRest = (o) => Object.assign(A.state.answers,
    { frequency: 'mostDays', purpose: 'writing', limits: 'never', media: 'no',
      pays: ['none'], team: 'solo', priority: 'cost', student: 'no' }, o || {});
  const profile = prov => A.profileFor(prov, A.state.answers, sigFor(A.state.answers));

  load({ version: 2, platforms: [{ provider: 'openai', messages_per_day: 30,
    input_tokens_per_day: 18000, output_tokens_per_day: 15000, billed_input_tokens_per_day: 120000,
    user_turns_per_day: 30, billed_days: 30, models_used: ['gpt-5.6-luna', 'gpt-5.6-sol'],
    model_usage: [
      { key: 'gpt-5.6-luna', input_tokens_per_day: 15000, output_tokens_per_day: 12000, billed_input_tokens_per_day: 100000 },
      { key: 'gpt-5.6-sol', input_tokens_per_day: 3000, output_tokens_per_day: 3000, billed_input_tokens_per_day: 20000 }] }] });
  withRest();
  let pf = profile('openai');
  ok('v2 prices the billed input, not the visible text', pf.input_tokens_per_day === 120000, pf.input_tokens_per_day);
  ok('v2 carries the per-model split', pf.perModel && pf.perModel.length === 2);
  ok('v2 sets the frontier signal from a paid-tier model', A.state.answers.frontier === 'always', A.state.answers.frontier);
  const expected = (100000 * A.API['gpt-5.6-luna'].in + 12000 * A.API['gpt-5.6-luna'].out
                  + 20000 * A.API['gpt-5.6-sol'].in + 3000 * A.API['gpt-5.6-sol'].out) * 30;
  ok('each model is priced at its OWN rate', Math.abs(A.apiCostPerMonth(pf) - expected) < 1e-9,
     { got: A.apiCostPerMonth(pf), expected });

  load({ version: 1, platforms: [{ provider: 'anthropic', messages_per_day: 20,
    input_tokens_per_day: 9000, output_tokens_per_day: 7000, models_used: ['claude-sonnet-5'] }] });
  withRest(); pf = profile('anthropic');
  ok('v1 falls back to visible input', pf.input_tokens_per_day === 9000, pf.input_tokens_per_day);
  ok('v1 absent billed field is not read as zero', pf.input_tokens_per_day > 0);
  ok('free-tier-only models do not set the frontier signal', A.state.answers.frontier === 'default');

  load({ version: 2, platforms: [{ provider: 'anthropic', messages_per_day: 5, input_tokens_per_day: 4000,
    output_tokens_per_day: 3000, billed_input_tokens_per_day: 0, models_used: ['claude-sonnet-5'] }] });
  withRest();
  ok('a MEASURED billed value of 0 is respected', profile('anthropic').input_tokens_per_day === 0);

  let threw = null;
  try {
    load({ version: 2, platforms: [
      { provider: 'xai', messages_per_day: 50, input_tokens_per_day: 1, output_tokens_per_day: 1, models_used: ['grok-4.5'] },
      { provider: 'openai', messages_per_day: 10, input_tokens_per_day: 5000, output_tokens_per_day: 4000, models_used: ['gpt-5.6-luna'] }] });
  } catch (e) { threw = String(e); }
  ok('an export naming a provider we do not audit does not throw', !threw, threw);
  ok('unaudited provider is dropped', !(A.state.answers.tools || []).includes('xai'), A.state.answers.tools);
  ok('audited provider in the same export survives', (A.state.answers.tools || []).includes('openai'));

  load({ version: 2, platforms: [{ provider: 'openai', messages_per_day: 10, input_tokens_per_day: 5000,
    output_tokens_per_day: 4000, billed_input_tokens_per_day: 30000, models_used: ['gpt-4o'],
    model_usage: [{ key: 'gpt-4o', input_tokens_per_day: 5000, output_tokens_per_day: 4000, billed_input_tokens_per_day: 30000 }] }] });
  withRest(); pf = profile('openai');
  ok('a legacy model unknown to the tier list does not force an upgrade',
     /Stay on the free/.test(A.recommend(pf, sigFor(A.state.answers)).head));
  ok('that legacy model is still priced', A.apiCostPerMonth(pf) > 0);

  for (const [name, log] of [['empty platforms', { platforms: [] }], ['no platforms key', {}],
                             ['platform with no numbers', { version: 2, platforms: [{ provider: 'openai' }] }]]) {
    threw = null;
    try { load(log); withRest(); A.recommend(profile('openai'), sigFor(A.state.answers)); } catch (e) { threw = String(e); }
    ok('degenerate export survives: ' + name, !threw, threw);
  }

  load({ version: 2, platforms: [
    { provider: 'openai', messages_per_day: 30, input_tokens_per_day: 1000, output_tokens_per_day: 1000, models_used: ['gpt-5.6-luna'] },
    { provider: 'anthropic', messages_per_day: 40, input_tokens_per_day: 1000, output_tokens_per_day: 1000, models_used: ['claude-sonnet-5'] }] });
  ok('the volume band uses total messages across platforms', A.state.answers.messages === '50to150', A.state.answers.messages);
  withRest();
  ok('but each provider is sized on ITS OWN volume', profile('anthropic').messages_per_day === 40);

  console.log(bad ? '\n' + bad + ' FAILURE(S) of ' + ran + ' checks'
                  : 'all auditor behaviour tests pass — ' + ran + ' checks, ' + combos + ' answer combinations swept');
  process.exit(bad ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
