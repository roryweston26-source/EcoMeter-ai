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
const FILES = { '/extension/prices.json': 'extension/prices.json',
                '/student-access.json': 'student-access.json',
                '/plan-limits.json': 'plan-limits.json' };
const fetchStub = url => {
  const f = FILES[String(url).split('?')[0]];
  if (!f) return Promise.resolve({ ok: false });
  return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(R + f, 'utf8'))) });
};
function FileReaderStub() {}

const EXPORTS = ['PLANS', 'API', 'MODELS', 'NAME', 'TOP_IS_FREE', 'LEGACY_ONLY', 'state',
  'recommend', 'profileFor', 'meetsNeeds', 'clearsNonModelNeeds', 'apiCostPerMonth',
  'currentPlans', 'classify', 'applyEcometer', 'limitsFactor', 'advancedModels', 'payOptions',
  'breakEven', 'costPerMessage', 'ARCHETYPE', 'PURPOSE_TOK', 'studentNote', 'offerLive'];
const A = new Function('document', 'window', 'fetch', 'FileReader',
  src + '\nreturn {' + EXPORTS.join(',') + '};')(documentStub, windowStub, fetchStub, FileReaderStub);

/* ---------- load pricing.html's break-even engine, to compare against ----------
   audit.html carries its own copy of breakEven() so the Auditor can quote the same
   figure the subscriptions table shows. Two implementations of one number is the
   drift this repo keeps paying for, so rather than trust them to stay in step we
   load BOTH and assert they agree. pricing.html's script is an IIFE, so we slice
   its body and inject a return. */
const pricingHtml = fs.readFileSync(R + 'pricing.html', 'utf8');
const pSrc = pricingHtml.slice(pricingHtml.indexOf('<script>') + '<script>'.length, pricingHtml.lastIndexOf('</script>'));
const pBody = pSrc.slice(pSrc.indexOf('{', pSrc.indexOf('(function')) + 1, pSrc.lastIndexOf('})()'));
const pDocEl = () => ({
  innerHTML: '', textContent: '', value: '', className: '', dataset: {}, style: {}, checked: false, open: false,
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  addEventListener() {}, click() {}, appendChild() {}, setAttribute() {}, getAttribute() { return null; },
  querySelector() { return pDocEl(); }, querySelectorAll() { return []; }, closest() { return pDocEl(); },
  remove() {}, focus() {}
});
const pDoc = { getElementById: pDocEl, querySelector: pDocEl, querySelectorAll: () => [],
               createElement: pDocEl, body: pDocEl(), addEventListener() {} };
const pWin = { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }), location: { hash: '' } };
const PFILES = { '/extension/prices.json': 'extension/prices.json', '/plan-limits.json': 'plan-limits.json' };
const pFetch = url => {
  const f = PFILES[String(url).split('?')[0]];
  if (!f) return Promise.resolve({ ok: false });
  return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(R + f, 'utf8'))) });
};
const P = new Function('document', 'window', 'fetch',
  pBody + '\nreturn { breakEven, costPerMessage, state, PLAN_LIMITS: () => PLAN_LIMITS };')(pDoc, pWin, pFetch);

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
        FRO = ['default', 'sometimes', 'always'], MED = ['no', 'occ', 'regular'], TEAM = ['solo', 'team'],
        PRIO = ['cost', 'capability', 'privacy', 'feature'];
  const problems = {};
  const note = (t, extra) => { problems[t] = problems[t] || { n: 0, first: extra }; problems[t].n++; };
  let combos = 0;

  for (const prov of Object.keys(A.PLANS)) {
    const tiers = sorted(prov);
    for (const messages of MSG) for (const frequency of FREQ) for (const purpose of PUR)
    for (const limits of LIM) for (const frontier of FRO) for (const media of MED) for (const team of TEAM)
    for (const priority of PRIO) {
      const a = { tools: [prov], messages, frequency, purpose, limits, frontier, media, team,
                  pays: ['none'], priority, student: 'no' };
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

  /* ---------- 1b. break-even must match pricing.html exactly ---------- */
  {
    const limits = JSON.parse(fs.readFileSync(R + 'plan-limits.json', 'utf8'));
    const subs = JSON.parse(fs.readFileSync(R + 'extension/prices.json', 'utf8')).subscriptions;
    let compared = 0, mismatches = [];
    for (const arch of ['light', 'standard', 'heavy']) {
      P.state.arch = arch;                                   // pricing.html reads this
      const arc = { in: limits._meta.archetypes[arch].input, out: limits._meta.archetypes[arch].output };
      for (const prov of Object.keys(A.PLANS)) for (const tier of A.PLANS[prov]) {
        const sub = subs.find(s => s.p === prov && s.m === tier.m);
        const lim = limits.plans.find(x => x.p === prov && x.m === tier.m);
        const mine = A.breakEven(prov, tier, arc);
        const theirs = P.breakEven(sub, lim);
        if (!mine && !theirs) continue;
        compared++;
        if (!mine || !theirs) { mismatches.push({ arch, plan: tier.m, mine: !!mine, theirs: !!theirs }); continue; }
        if (Math.abs(mine.few - theirs.few) > 1e-9 || Math.abs(mine.many - theirs.many) > 1e-9
            || mine.fewModel !== theirs.fewModel || mine.manyModel !== theirs.manyModel)
          mismatches.push({ arch, plan: tier.m, mine, theirs });
      }
    }
    P.state.arch = 'standard';
    ok('break-even agrees with pricing.html on every plan and archetype', mismatches.length === 0,
       { compared, mismatches: mismatches.slice(0, 3) });
    ok('break-even was actually computed for the paid plans', compared >= 24, compared);

    // The long-context tier is DORMANT at today's archetypes (heavy is 15k input,
    // the thresholds are 200k-272k), so comparing outputs can't see it — both pages
    // would agree even if one dropped it. Force an archetype over the threshold so
    // the branch is actually executed, and losing it fails here rather than silently
    // halving the cost the day someone adds a document-sized archetype.
    const prices = JSON.parse(fs.readFileSync(R + 'extension/prices.json', 'utf8'));
    const sol = prices.api.openai['gpt-5.6-sol'];
    ok('the model used for the long-context check still has a long tier', !!(sol && sol.long));
    if (sol && sol.long) {
      const big = { in: sol.long.over + 28000, out: 1000 };
      const pl = P.PLAN_LIMITS();
      pl._meta.archetypes.__over = { input: big.in, output: big.out };
      P.state.arch = '__over';
      const mine = A.costPerMessage('openai', 'gpt-5.6-sol', big);
      const theirs = P.costPerMessage('openai', 'gpt-5.6-sol');
      const shortRate = big.in * sol.input + big.out * sol.output;
      const longRate  = big.in * sol.long.input + big.out * sol.long.output;
      ok('above the threshold the LONG rate is used, not the short one',
         Math.abs(mine - longRate) < 1e-9 && Math.abs(mine - shortRate) > 1e-9, { mine, longRate, shortRate });
      ok('and pricing.html does the same thing there', Math.abs(mine - theirs) < 1e-9, { mine, theirs });
      P.state.arch = 'standard';
      delete pl._meta.archetypes.__over;
    }
  }

  /* ---------- 1c. break-even appears on a paid recommendation ---------- */
  {
    const a = { tools: ['anthropic'], messages: '50to150', frequency: 'constant', purpose: 'coding',
                limits: 'never', frontier: 'always', media: 'no', team: 'solo', pays: ['none'],
                priority: 'cost', student: 'no' };
    const sig = sigFor(a);
    const r = A.recommend(A.profileFor('anthropic', a, sig), sig);
    const line = r.why.find(w => typeof w === 'string' && /Break even at/.test(w));
    ok('a paid recommendation carries the break-even figure', !!line, r.why);
    ok('break-even line names both value models', !!line && /Opus|Haiku|Sonnet/.test(line), line);
    ok('and says where the user sits against it',
       r.why.some(w => typeof w === 'string' && /messages\/day (clears|you're below)/.test(w)), r.why);
    // free recommendations must NOT carry one — there is nothing to break even on
    const b = Object.assign({}, a, { messages: 'lt5', frequency: 'rarely', purpose: 'quick', frontier: 'default' });
    const rb = A.recommend(A.profileFor('anthropic', b, sigFor(b)), sigFor(b));
    ok('a free recommendation carries no break-even line',
       /Stay on the free/.test(rb.head) && !rb.why.some(w => typeof w === 'string' && /Break even/.test(w)), rb.head);
  }

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

  /* ---------- 2b. every paid tier is selectable ----------
     Four of the ten were not, and the list was hand-written with no guard on the
     completeness direction. The expensive one was Claude Max 20x: a $200/mo payer
     had to pick "Claude Max", which resolved to Max 5x at $100, so the saving we
     quoted them was $100/mo too small — this tool's headline number, wrong, on the
     largest overpayment it exists to catch. */
  {
    const opts = A.payOptions(), vals = new Set(opts.map(o => o.v));
    const missing = [];
    for (const prov of Object.keys(A.PLANS)) for (const tier of A.PLANS[prov])
      if (tier.price > 0 && !vals.has(prov + '::' + tier.m)) missing.push(prov + '::' + tier.m);
    ok('every paid tier can be named in "what do you pay for today?"', missing.length === 0, missing);
    ok('the pays list still offers "Nothing" and the API', vals.has('none') && vals.has('api'));

    const a = { tools: ['anthropic'], messages: '5to20', frequency: 'mostDays', purpose: 'writing',
                limits: 'never', frontier: 'default', media: 'no', team: 'solo',
                pays: ['anthropic::Claude Max 20\u00d7'], priority: 'cost', student: 'no' };
    const cp = A.currentPlans(a);
    ok('Claude Max 20x resolves to its own $200 price', cp.length === 1 && cp[0].price === 200, cp);
    const sig = sigFor(a);
    const r = A.recommend(A.profileFor('anthropic', a, sig), sig);
    const save = r.why.find(w => typeof w === 'object' && /saves/.test(w.html));
    ok('and the over-payment is quoted against $200, not $100', !!save && /\$200/.test(save.html), save && save.html);
  }

  /* ---------- 2c. frequency moves the money ----------
     It used to feed nothing but the cosmetic level badge, so a few-times-a-week
     user was billed for a month of daily use and every subscription looked better
     than it was. Volume for CAP checks still has to be the busy day. */
  {
    const base = { tools: ['openai'], messages: '20to50', purpose: 'writing', limits: 'never',
                   frontier: 'always', media: 'no', team: 'solo', pays: ['none'], priority: 'cost', student: 'no' };
    const daily = Object.assign({}, base, { frequency: 'constant' });
    const weekly = Object.assign({}, base, { frequency: 'fewWeek' });
    const pd = A.profileFor('openai', daily, sigFor(daily));
    const pw = A.profileFor('openai', weekly, sigFor(weekly));
    ok('a few-times-a-week user is billed for fewer days than a daily one',
       pw.days_per_month < pd.days_per_month, { weekly: pw.days_per_month, daily: pd.days_per_month });
    ok('and the API bill scales with exactly that',
       Math.abs(A.apiCostPerMonth(pw) / A.apiCostPerMonth(pd) - pw.days_per_month / pd.days_per_month) < 1e-9,
       { weekly: A.apiCostPerMonth(pw), daily: A.apiCostPerMonth(pd) });
    ok('but the cap check still uses the busy day, not the average',
       pw.messages_per_day === pd.messages_per_day, { pw: pw.messages_per_day, pd: pd.messages_per_day });
    ok('while break-even compares the average day', pw.avg_messages_per_day < pw.messages_per_day,
       { avg: pw.avg_messages_per_day, busy: pw.messages_per_day });
    ok('an unknown frequency bills all 30 days — never understate an API bill',
       A.profileFor('openai', Object.assign({}, base, { frequency: 'nonsense' }), sigFor(base)).days_per_month === 30);
  }

  /* ---------- 2d. "what matters most" is not dead ----------
     It was collected into the signals object and read by nothing: the last question
     before the result changed nothing about the result. The second assertion here is
     the one that would have caught that. */
  {
    let worse = null, moved = 0;
    for (const prov of Object.keys(A.PLANS))
      for (const messages of MSG) for (const purpose of PUR) for (const frontier of FRO) for (const media of MED) {
        const base = { tools: [prov], messages, frequency: 'mostDays', purpose, limits: 'never',
                       frontier, media, team: 'solo', pays: ['none'], student: 'no' };
        const c = Object.assign({}, base, { priority: 'cost' });
        const k = Object.assign({}, base, { priority: 'capability' });
        const rc = parse(prov, A.recommend(A.profileFor(prov, c, sigFor(c)), sigFor(c)));
        const rk = parse(prov, A.recommend(A.profileFor(prov, k, sigFor(k)), sigFor(k)));
        if (rc.cost > rk.cost + 1e-9 && !worse) worse = { prov, base, cost: rc.cost, capability: rk.cost };
        if (Math.abs(rc.cost - rk.cost) > 1e-9) moved++;
      }
    ok('"lowest cost" never lands on a costlier answer than "best capability"', !worse, worse);
    ok('and the tie-break actually fires somewhere — question 11 is wired to something', moved > 0, moved);

    const a = { tools: ['openai'], messages: '50to150', frequency: 'mostDays', purpose: 'coding',
                limits: 'never', frontier: 'always', media: 'no', team: 'solo', pays: ['none'],
                priority: 'privacy', student: 'no' };
    const rp = A.recommend(A.profileFor('openai', a, sigFor(a)), sigFor(a));
    ok('the privacy answer gets an actual answer back',
       rp.why.some(w => typeof w === 'string' && /privacy matters most/.test(w)), rp.why);
    const b = Object.assign({}, a, { priority: 'feature' });
    const rf = A.recommend(A.profileFor('openai', b, sigFor(b)), sigFor(b));
    ok('the feature answer names what the tier actually adds',
       rf.why.some(w => typeof w === 'string' && /specific feature is what matters/.test(w)), rf.why);
    ok('and never leaks a raw feature key at the reader',
       !rf.why.some(w => typeof w === 'string' && /sol-pro|image-gen|video-gen|extended-thinking/.test(w)), rf.why);
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
                  + 20000 * A.API['gpt-5.6-sol'].in + 3000 * A.API['gpt-5.6-sol'].out) * pf.days_per_month;
  ok('each model is priced at its OWN rate', Math.abs(A.apiCostPerMonth(pf) - expected) < 1e-9,
     { got: A.apiCostPerMonth(pf), expected });
  ok('and billed across the days actually used, not a flat 30', pf.days_per_month === 24, pf.days_per_month);

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

  /* ---------- 3b. a corrected pre-filled answer beats the export ----------
     The quiz pre-filled these, showed them as answerable, let the reader change
     them — and then used the export's value anyway. Asking a question and
     discarding the answer, only harder to notice than the dead question 11. */
  load({ version: 2, platforms: [{ provider: 'openai', messages_per_day: 30, input_tokens_per_day: 18000,
    output_tokens_per_day: 15000, billed_input_tokens_per_day: 120000, models_used: ['gpt-5.6-luna'] }] });
  withRest();
  ok('the import records which answers it filled in', !!(A.state.answers._ecoFill || {}).messages,
     A.state.answers._ecoFill);
  ok('left alone, the measured volume is used', profile('openai').messages_per_day === 30);
  A.state.answers.messages = 'lt5';
  A.state.answers._ecoOverride = { messages: true };
  const corrected = profile('openai');
  ok('corrected, the reader own answer wins', corrected.messages_per_day === 3, corrected.messages_per_day);
  ok('and we stop calling that volume measured', corrected.measured === false);
  ok('but the measured per-message SIZE survives and rescales',
     Math.abs(corrected.input_tokens_per_day - 3 * (120000 / 30)) < 1, corrected.input_tokens_per_day);

  /* ---------- 4. the student answer has to reach the recommendation ----------
     It didn't: the routes panel rendered below the cards, so a student could be told
     to buy a plan while a free year of that same plan sat further down the page,
     unconnected. These assert the join exists, stays inside 'claimable by this
     reader', and dies with the deadline. */
  const stu = o => Object.assign({ tools: ['google'], frequency: 'mostDays', messages: '20to50',
    purpose: 'writing', limits: 'sometimes', frontier: 'default', media: 'no', team: 'solo',
    pays: ['none'], priority: 'cost', student: 'student' }, o || {});
  const gNote = A.studentNote('google', stu());
  ok('a student picking Gemini is told about the claimable route', !!gNote, gNote);
  ok('and the note names the offer from the data, not from prose here',
     !!gNote && gNote.includes('Google'), gNote);
  ok('a non-student gets no student note', A.studentNote('google', stu({ student: 'no' })) === null);
  ok('a teacher is not sold a student offer', A.studentNote('google', stu({ student: 'teacher' })) === null);
  ok('an institutional programme is not presented as claimable',
     A.studentNote('anthropic', stu({ tools: ['anthropic'] })) === null);
  ok('a deadline in the past is not a live offer', A.offerLive({ claim_by: '2020-01-01' }) === false);
  ok('a deadline in the future is', A.offerLive({ claim_by: '2099-01-01' }) === true);
  ok('and a route with no deadline is live', A.offerLive({}) === true);

  console.log(bad ? '\n' + bad + ' FAILURE(S) of ' + ran + ' checks'
                  : 'all auditor behaviour tests pass — ' + ran + ' checks, ' + combos + ' answer combinations swept');
  process.exit(bad ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
