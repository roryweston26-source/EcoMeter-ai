# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-08-24._

> Read **CLAUDE.md** first (mission, principles, voice — auto-loaded). This is the deep dive.
> For anything that goes stale — prices, caps, student offers, clock anchors, selectors, store state — see **[`FRESHNESS.md`](FRESHNESS.md)**, which is the executable checklist version of the open threads below.

---

## 0. Working state (read this first) — as of 2026-08-24

### ⚠️ The single most important thing

**The Chrome Web Store has a build that is materially wrong, and the fixed build has NOT been uploaded.** Rory submitted before the 2026-08-02 work started, so whatever is in review or published carries:
- **billed input charged at ~2×** (every "true cost" figure roughly double)
- **Claude image tokens at ~51×** (any conversation with an image wildly overcounted)
- **"±8% token estimate"** in the panel, when the real figure was 12.9% with a systematic undercount bias
- stale prices, no GPT-5.6 family, export v1

All of it is fixed on `main`. **Nothing has shipped.** Direction of error is *over*-estimating, which is the less harmful way to be wrong, but a 2× cost overcount is exactly the failure this project exists to avoid.

**First action for the next session: get the store status from Rory** (dashboard → the item → status + version), then:
| Status | What to do |
|---|---|
| Pending review | Store blocks new uploads. Wait it out, then upload the fixed build immediately. |
| Published | Upload the fix now. Needs a **version bump to 6.13** (6.12 would be a duplicate). |
| Rejected | Upload unblocked immediately. If it was the keyword rejection again, the fixed copy is already in `STORE-LISTING.md`. |

Also worth asking: **did the submission use the old description?** If pasted from the dashboard's existing text rather than the updated `STORE-LISTING.md`, it carries the nine-platform list that drew *Yellow Argon* — another rejection is near-certain regardless of code.

### Ship status

- **Website: current.** `main` auto-deploys; everything below is live on `legerlyai.com`.
- **Extension: NOT current.** `main` is ready to build; see §11 for the build (two Windows traps, one of which uploads successfully and just ships broken icons).
- **v6.12 was REJECTED 2026-07-29** — *Spam and Placement in the Store*, ref **Yellow Argon**: "excessive keywords in the item's description", quoting the nine-platform list. Listing copy only; code and permissions were never at issue. Fixed, with a standing rule at the top of `STORE-LISTING.md`.
- Whatever is submitted still adds the **`generativelanguage.googleapis.com` host permission**, so expect permission re-review and a user-facing notice regardless.
- Paste-ready store answers already exist — don't recompose them: `STORE-SUBMISSION.md` (single purpose, per-permission justifications, data-usage disclosure — submitted as **"Website content" only**, reasoning in its §3) and `STORE-LISTING.md` (descriptions + pre-upload checklist).

### 2026-08-24 — price re-verification against every provider's own pages

A full re-check of every price, model and plan, asked for as "make sure the Auditor is the best it can be". **Four of the eight providers had moved in sixteen days**, and the errors did not point the same way — two overstated cost, one understated it badly.

- **DeepSeek's warned price rise landed, and it is the big one.** v4-flash went $0.14/$0.28 → **$0.44/$1.32** and v4-pro $0.435/$0.87 → **$1.32/$3.96**: roughly 3× input, 4.5× output. This is the error that mattered most, because DeepSeek is the provider the Auditor's *downgrade* advice leans on hardest — "cancel your plan and pay per token" was being priced at a quarter of the real rate. **Understating an API rate is the dangerous direction** for a should-I-pay tool: it argues people out of subscriptions that were actually the cheaper option.
- **DeepSeek now meters by the clock**, which nothing else here does: peak is 01:00–04:00 and 06:00–10:00 UTC on weekdays, everything else is half price. Stored rates are the **peak** rates deliberately — off-peak is a discount you only get if your usage happens to miss a window you don't control, and the cheap number would flatter exactly the advice most likely to hurt someone.
- **OpenAI cut GPT-5.6 Sol** $5/$30 → **$4/$20** (long $10/$45 → $8/$30). Sol is what ChatGPT Plus unlocks, so this sits directly under the most common paid recommendation the Auditor makes.
- **Google put 3.6 Flash on a half-price promo** ($1.50/$7.50 → **$0.75/$3.75**) through 2026-12-31, and shipped **Gemini 3.7 Flash** at the same rate. We had been carrying the post-promo number as if it were current — 2× too high.
- **Anthropic made Sonnet 5's $2/$10 permanent.** The scheduled 2026-09-01 rise to $3/$15 **will not happen**. This had been the nearest-term dated task in this file; it is closed, and `pricing.html` had been telling readers the price would rise in a week, which was about to become false.
- **GPT-5.5 has finished leaving ChatGPT Free and Go.** On 2026-08-08 the honest read was that it stayed (mid-rollout); both OpenAI surfaces now agree it has gone — the plan table's single "Legacy models" row reads No/No/Yes/Yes, and the Free Tier FAQ (updated 2026-08-13) lists only Luna.
- **Google's free default moved 3.5 Flash → 3.6 Flash**; **xAI's free tier runs Grok 4.6**, its current flagship (x.ai ticks 4.6 in *every* column, so xAI joins the gate-on-quota-not-models group in fact if not yet in `TOP_IS_FREE`); **Le Chat is now branded "Vibe"** (confirmed, plan keys kept as the cross-file join); **SuperGrok Plus at $100/mo** is a new tier.

**A methodology bug found on the way, worth more than any single price.** `advancedModels()` derives "this person needs frontier models" from "this model sits behind a paywall". Those came apart: OpenAI moved GPT-5.5 into its Legacy bucket, so 5.5 became paid-only **by getting old, not by getting better** — and the engine would have read someone still on 5.5 as someone who needs Sol, and pushed them up a tier for it. `LEGACY_MODELS` is now subtracted explicitly, and `check-auditor.js` asserts every entry actually enters the advanced set (it caught a no-op entry of mine on the first run, and the subtler point that GPT-5.5 is simultaneously free on Copilot and paywalled on OpenAI).

**New guard — promotional rates now expire loudly.** Sonnet 5 nearly taught this the expensive way: a dated introductory rate lived in `caveats` as prose, checkable only by a human remembering. Google then did the same thing three weeks later, so it is a recurring shape. Promoted models carry `promo: { until, standard:{input,output} }`, and `check-prices.js` **fails once `until` is past, naming the exact number to revert to** — so the revert doesn't require going back to the provider to find out what it was. Both new guards were verified by injecting the fault.

**A disclosure counter-example, recorded deliberately.** `plan-limits.json`'s thesis is that disclosure is one-directional and getting worse. OpenAI has now **added** a per-plan context window for every consumer tier (Instant 27K/54K/54K/128K, Reasoning Varies/256K/256K/400K) — the first figure any provider has published rather than withdrawn in the period this file covers. It doesn't overturn the finding (a context window bounds one conversation, not how many you get) but "nobody discloses anything" would now be false, and the honest claim is narrower: **nobody discloses an allowance**. It's in `_meta.context_windows_are_now_disclosed`, because a file that only collects evidence for its own thesis isn't evidence.

**The lesson this time:** the 2026-08-08 entry says to prefer the help centre over the marketing table. That held, but the sharper rule is **prefer whichever source is more recent and check both** — here the plan table and the help article *agreed* that 5.5 had gone, and the previous check's conclusion was correct when made and wrong sixteen days later. Nothing was misread; the world moved. **A verified number has a shelf life, and sixteen days was enough for four providers.**

### 2026-08-24 — `FRESHNESS.md` added, and the first pass run against it

New file: **[`FRESHNESS.md`](FRESHNESS.md)** — every figure and claim in this repo that goes stale, where its copies live, what to verify it against, and which script proves the fix. 30 entries in 10 sections (A prices … J hygiene), written so one prompt can re-verify the whole project. It is now referenced from `CLAUDE.md`, and the rule there is that anything time-sensitive gets an entry **in the same commit that introduces it**.

**The student-access findings are the ones that matter, and both went the wrong way for us:**

- **Google's free student year is BACK, and we were telling students it was dead.** We recorded it as `none` on 2026-08-08 and that was correct then — the previous run closed 2026-04-30 (US). Google has since relaunched it: **12 months of AI Pro free in the US, AI Plus in 140+ other markets, redeemable until 2026-12-31**, SheerID-verified. Confirmed on `blog.google` and `support.google.com`. That is ~$240 we were steering students away from. Now `disclosed`, with the auto-renew trap called out — it requires a payment method and converts to $19.99/mo silently.
- **GitHub's Copilot student pause is over.** Confirmed on `github.com/education/students`: free for verified students again. Was `paused`; now `disclosed`, with the real limitation recorded (auto model selection only, credit-metered chat — it is not Copilot Pro).
- OpenAI re-verified: ChatGPT for Teachers still free for verified US K-12 educators **through June 2027**, nothing for individual students. Anthropic still institutional-only. Mistral's $5.99 student rate holds; the product is now branded **Vibe**, plan key kept as the join.

**The lesson, and it is the inverse of the one we already had.** `student-access.json` has carried a caveat since 2026-08-08 that EXPIRED OFFERS OUTLIVE THEMSELVES — don't repeat a dead offer as live. True, and it did not save us, because the failure ran the other way: **a verified absence expires too.** We checked carefully, were right, wrote it down with sources, and the fact rotted anyway. A false negative is the worse direction — it costs the reader money and it is invisible, because nobody publishes a correction when a discount quietly comes back. **Re-check the `none` and `paused` rows as hard as the live ones.** Recorded as a second caveat in the file.

**Also this pass:**
- **`scripts/check-clock.js` — new, and it closes old open thread 9.** The clock's levels were the one thing no script judged. It now asserts (1) `ai-clock.html`'s SCENARIOS/RATES fallback matches `clock.json`, (2) the scenarios bracket published totals for the two counters where an authoritative total exists — capex vs big-four guidance, energy vs IEA — and (3) no single company's own disclosure is an absurd share of our world total. Verified against the real bug: replaying the pre-2026-08-08 levels, it fails with capex 34.9% off (recorded at the time as 35%) and Google at 80% of world tokens (recorded as ~78%). Machine-readable anchors live in `clock.json._meta.plausibility`; it **deliberately refuses** to carry targets for counters nobody publishes a total for. Wired into `validate-site.yml`. Current clock passes.
- **`extension/water.json` had one date doing two jobs.** `_last_updated` moved whenever a model tier was added, which made the ml-per-token estimates look freshly verified when they had not been re-read since Dec 2025. Split into `_last_updated` (file changed) and `_tiers_last_sourced` (figures re-checked). No provider has published a newer per-token figure; a 2026 peer-reviewed comparison found none reports an AI-specific water metric at all.
- **`pricing.html`'s header comment was two facts out of date** — it claimed subscription prices were not in `prices.json` and were hand-maintained, "Verified June 2026", while the fetch handler has been overwriting them from `prices.json` for some time. Fixed, with the reason noted inline.
- **Transparency Index re-checked, grade deliberately unchanged.** Third-party coverage says Microsoft's full 2026 Environmental Sustainability Report now breaks out power and water **by named campus**. We could not confirm it on a Microsoft-owned page — its efficiency page still publishes global/regional PUE and WUE only, and the report PDF was not machine-readable in our tooling. Left `red` and recorded as an open question rather than repeated. **If true, Microsoft becomes the second provider after Google to disclose per-site, and it is the highest-value thing to check next on that index.**
- **`datacenters.json` — one site re-verified (xAI Colossus 1), file-level `last_updated` left at 2026-07-13 on purpose.** Bumping it after checking 1 of 12 sites would claim a verification that did not happen; per-site `as_of` is the honest granularity. Rationale recorded in `_meta.partial_verification`. New fact: the Memphis reuse plant now **has** its TDEC permit (effective 2026-02-01, would spare up to 13M gal/day of aquifer) but **construction has not started** — a permit is not a plant, and it reads like progress while changing nothing.

### 2026-08-08 — Subscription Auditor audit (ahead of a student-facing launch)

Rory is about to market the Auditor to college students deciding whether to pay for AI, so every number and every branch got re-checked against the providers' own pages. **The Auditor had been left behind by the 2026-08-02 price refresh** — the extension picker, `pricing.html` and `prices.json` all got the GPT-5.6 family; `audit.html` did not.

- **OpenAI's consumer lineup in `audit.html` no longer existed.** It gated on `gpt-5.5` / `gpt-5.4` / `o3` / `o4-mini`. Verified on openai.com's plan-comparison table 2026-08-08: Free and Go get **GPT-5.6 Luna (unlimited) + GPT-5 Thinking Mini and nothing else** — no Sol, and **no legacy models, which is now where GPT-5.5 lives**. Plus adds Sol; Pro adds Sol Pro.
- **ChatGPT Free is advertised as unlimited text chat.** The Auditor capped it at 45 messages/day, so a high-volume student was pushed to Go or Plus on volume that no longer costs anything. For a "should I pay?" tool this was the single most expensive error, and it pointed at the user's wallet.
- **`gemini-2.5-pro` was modelled as the thing Google AI Pro unlocks.** It isn't: 3.1 Pro is the flagship and is already in the free app (limited daily), and every Google tier runs the same models. The Auditor was recommending $19.99/mo for access to a legacy model. Google gates on quota and features, never model access — same for Copilot, so both are now in `TOP_IS_FREE`.
- **`gemini-3.5-flash` sat at $0.50/$3.00 in the inline `API` fallback** — the wrong figure corrected in `prices.json` on 2026-07-28. Live for ten days, biting only when the fetch failed, and biasing advice toward "drop your plan and pay per token".
- **Tokens per message disagreed ~6× with `plan-limits.json`.** The Auditor used `purpose × 0.4/0.6` in/out (≈600 input per message); `plan-limits.json` says 4,000 for a standard exchange because every turn resends the transcript. Dollar totals happened to land close through offsetting errors, which is luck, not correctness. Now mapped onto the same three archetypes, so both tools tell one story.
- **`ADVANCED` is now derived from `PLANS`** rather than a static set that had no 5.6 keys — an export from someone running Sol daily was being read as a free-tier user.
- **Caps now carry a `capSource`** (`disclosed` / `third_party` / `estimate` / `not_disclosed`) and the result says which. `plan-limits.json`'s finding is that exactly one absolute consumer cap is published anywhere; the Auditor was quietly inventing a full ladder. Claude Pro's 225/day was Max 5×'s per-5h figure misread as Pro's per-day — now 144/day from the third-party 45/5h over 16 waking hours.
- **Where volume alone pushes you up a tier, the result now says the number doing the pushing is ours, names the cheaper tier, and tells you to start there.** A heavy Gemini user was being sent to Ultra at $99.99 on a cap ladder we made up.
- Smaller: the media line told ChatGPT users to "add a ChatGPT plan"; Copilot was quoted an API-equivalent cost `plan-limits.json` explicitly refuses to compute; regular image work now gates properly (which makes **Go at $8 recommendable instead of Plus at $20**); a free-tier model added in `prices.json` but absent from the inline paid tiers would have dead-ended every user of it into "look at Team".

**Then a correction to the above, found by reading OpenAI's help article rather than its pricing table:** GPT-5.5 is **not** a paid-only legacy model. It "remains the default model", Free keeps limited Instant access in a 5-hour window, and GPT-5.6 Luna is *mid-rollout* as its replacement for Free/Go. The plans table filing GPT-5.5 away from the GPT-5.6 rows was misleading, and taking that at face value would have wrongly stripped GPT-5.5 from the free tier. Both `prices.json` and `audit.html` now carry all three (Luna default, GPT-5.5 Instant limited, GPT-5.4 Thinking mini). **Free/Go get no Sol at any reasoning level** — stated three separate times, unambiguous.

**And the reason the pricing page needed touching too: OpenAI deleted its only published cap.** The "160 GPT-5.5 Instant messages / 3h" figure that `plan-limits.json` recorded as `disclosed` for Go and Plus is **no longer in the help article** — replaced by limits that "can be dynamic and may vary". Knock-ons:
- ChatGPT Plus is now `not_disclosed` and is **the most expensive consumer tier of any provider publishing no usage figure at all.**
- The only absolute figure left anywhere is Go's **10 Thinking messages / 5h** — a *feature* sub-limit, not a general allowance. It is flagged `scope_limited: true` and `capPerDay()` now refuses it, the same way it refuses an undisclosed multiplier base: pricing Go off its Thinking limit while ordinary chat is unlimited would put the ceiling far below the plan's real worth.
- **The Ceiling column now computes for zero plans.** That is the honest state and a sharper version of the original finding, so the column stays — it's the evidence. The callout and lede copy were rewritten; both had asserted the deleted cap in prose.
- `pricing.html` carries an inline `FALLBACK_LIMITS` snapshot — a **seventh** copy of this data, unguarded, and it still held the old caps. `check-auditor.js` now diffs all 26 rows of it against `plan-limits.json`.

**DeepSeek added to the Auditor** (5 providers now). It's the one provider with no paid consumer tier, so its recommendation is always "free" — which is the point. Its result carries DeepSeek's own written warning that a "significant" price rise is coming, because the Auditor's cheapest advice leans on it hardest.

**The lesson:** this repeats PR #22's, one layer out. The Auditor passed `validate-site.js` and `check-prices.js` throughout, because neither reads it. **A file nothing checks is a file that is wrong** — and the give-away was again a number sitting beside a sentence contradicting it: `plan-limits.json` said in prose that nobody publishes caps, while `audit.html` shipped a confident ladder of them. **The second lesson is new: a provider's marketing table and its help centre disagree, and the help centre is the better source.** The pricing table implied GPT-5.5 was paid-only and gave no cap; the help article said GPT-5.5 is still the default and that the cap had been withdrawn. Check both, and prefer the one written for existing users over the one written to sell.

### Merged to `main` 2026-08-08 (PR #22) — AI Clock re-anchor

Off-cycle re-anchor of `clock.json`, a month after the Q3 anchor. **Two of these were numbers we were publishing wrong, not routine drift** — the pattern to take from it is that the growth *rates* were fine and the anchor *levels* were where the errors sat.

- **Capex was ~35% too high.** The `1.77` rate matched big-four guidance exactly ($410B → $725B), but the levels implied a **$978B calendar-2026 total**. Cut to 658/757/815. The page copy already said "$725B guided for 2026" — correct prose beside wrong data, which is how it survived a quarter.
- **Tokens were ~2× too low.** The old level tracked Goldman's May 2026 estimate (5.6 quadrillion/month), which left Google's *own disclosed* 3.2 quadrillion at ~78% of all tokens on Earth. Raised to 96/132/180 (×10¹⁵/yr). Knock-on: the per-token panel roughly halved, since those are derived as total ÷ tokens.
- **Users rate 1.5 → 1.35**; leaders slowed to ~1.3×/yr (ChatGPT 800M Dec 2025 → ~900M Jun 2026). Energy trimmed to the IEA 2026 figure.

**Three transparency fixes, which matter more than the numbers:**
- The methodology copy said *"anchored to Jan 1, 2026"* — **hardcoded, and stale for the entire Q3 anchor.** Now rendered from `_meta.anchor` into `#anchor-date`. Never hardcode that date again.
- Fleet size was described as ">10 GW by early 2026"; Epoch has ~30 GW at Q4 2025, and `clock.json`'s own `_meta` already had it right.
- CO₂ levels imply 230/309/433 g CO₂/kWh, but the page stated a flat "~395–400" as if fixed. Levels kept; copy rewritten to say the intensity is part of what the scenarios bracket.

**Dead data removed:** `rates.unitCost` + `unitCostIndex` were read by nothing (not the page, not the roller). Deleted rather than wired up — Epoch's ~40×/yr measures price at *fixed capability*, the panel measures *blended spend per token*; different quantities. `_meta.why_no_unit_cost_field` records why, so it doesn't get re-added. The per-unit panel is now documented on the page as derived rather than measured.

**The frontier counter can't be verified.** No 2026 record training run is publicly confirmed — labs stopped disclosing training compute. Still projected from Grok 4 (mid-2025), and now labelled on the page as the weakest number. "Not disclosed" is the honest state.

### Merged to `main` 2026-08-02 (PRs #20, #21)

Started as "add a value column to the pricing page" and became an audit, because checking the inputs kept turning things up.

**New feature —** Break even / Ceiling columns on `pricing.html` subscriptions (§3a), from a new `plan-limits.json` (§5).

**Bugs found by testing against ground truth, not by reading code (§4):**
- **Billed input ~2×** — replay accumulated per *message* rather than per *user turn*, and the caller double-counted on top.
- **Claude image tokens ~51×** — 32px patches × 65, versus Anthropic's documented 28px patches at one token each.

**Data corrections:**
- Three wrong API prices: `gemini-3.5-flash` 3× understated, `deepseek-v4-pro` 4× overstated, `grok-4.20` wrong.
- **`FALLBACK_PRICES` and `prices.json` disagreed in both directions** — the page showed different numbers depending on whether the fetch succeeded.
- Missing current flagships added (GPT-5.6 family, Gemini 3.6, Grok 4.5, Opus/Sonnet 4.5).
- **Google AI Plus $7.99 → $4.99**; Copilot Pro finished retiring 1 Aug 2026; ChatGPT Free now advertises unlimited GPT-5.6 Luna.
- OpenAI cut `gpt-5.6-terra` to $2/$12 and `gpt-5.6-luna` to $0.20/$1.20 (a 5× cut) on ~2026-08-02.

**Modelling added:** long-context tiers (§5), usage export **v2** carrying billed input (§6).

**The "±8% tokenizer" claim was false** — measured 12.9% MAE with −9.4% bias. Recalibrated to 10.5%/+2.2%, band widened to 11% (§4).

### Seven scripts now guard this — run them, they have already caught real regressions

```bash
node scripts/check-prices.js      # 5 files must agree on every price; fails on an EXPIRED promo rate
node scripts/check-auditor.js     # audit.html + pricing.html fallback vs prices.json / plan-limits / student-access
node scripts/test-auditor.js      # sweeps all 56,250 answer combos + the EcoMeter import
node scripts/test-cost-model.js   # 44 assertions: billed input, image tokens, tiers, export v2
node scripts/calibrate-tokenizer.js  # measures the estimator; fails if the UI band is optimistic
node scripts/check-clock.js       # clock fallback parity + level plausibility vs published totals
node scripts/validate-site.js     # pre-deploy HTML/JSON gate
```
`validate-site.yml` now runs FOUR on every PR — `validate-site.js`, `check-auditor.js`, `test-auditor.js` (added 2026-08-08) and `check-clock.js` (added 2026-08-24). `check-prices.js`, `test-cost-model.js` and `calibrate-tokenizer.js` are still manual; running them is part of a `FRESHNESS.md` pass.
`check-prices.js` caught a fallback that silently missed a patch during the 2026-08-02 refresh. `calibrate-tokenizer.js` is what proved the 8% claim wrong. `check-auditor.js` was written on 2026-08-08 because **`check-prices.js` never opens `audit.html`** — and the auditor turned out to be a sixth copy of the price table carrying a rate corrected ten days earlier. **`test-auditor.js` found a live bug on its first run:** the volume-aware downgrade kept its own copy of "does this tier clear your needs" that never received the image-generation gate, so **450 of 56,250 combinations told people who generate images regularly to drop to a free tier that throttles it**. The two definitions are now one function (`clearsNonModelNeeds`). **All six pass on `main` as of 2026-08-24.**

**Two guards added 2026-08-24, both verified by injecting the fault.** `check-prices.js` now fails when a `promo.until` date passes and names the standard rate to revert to — Sonnet 5 nearly cost us a wrong price because its expiry lived in prose that nothing could check, and Google put two models on a dated promo three weeks later. `check-auditor.js` now validates `LEGACY_MODELS`, the set subtracted from the frontier signal, asserting every entry genuinely enters the advanced set; it immediately caught a no-op entry and forced the realisation that GPT-5.5 is free on Copilot *and* paywalled on OpenAI at the same time.

**Data checks and behaviour checks catch different things, and the Auditor needed both.** `check-auditor.js` would never have found the downgrade bug — every file was internally consistent. Sweeping the answer space did, in seconds. When a change touches what the engine *decides* rather than what the data *says*, `test-auditor.js` is the one that matters.

⚠️ **`check-prices.js` does NOT cover `audit.html`.** `check-auditor.js` covers `audit.html` plus `pricing.html`'s inline `FALLBACK_LIMITS` (the seventh copy of the plan data), but not its prices — that's `check-prices.js`. They are complementary, not overlapping. Run both.

The clock gap is now closed. **`check-clock.js` (added 2026-08-24) is the sanity check open thread 9 asked for** — it compares each scenario's implied calendar-year total against a figure recorded in `clock.json._meta.plausibility`, and it was validated by replaying the PR #22 levels: capex fails at 34.9% off, and the tokens level fails a separate share bound because it put Google at 80% of all tokens on Earth. It also diffs `ai-clock.html`'s fallback copy and refuses a hardcoded anchor date. It covers capex and energy only, because those are the two counters with a single authoritative worldwide total; adding invented targets for the rest would launder a guess into a passing test.

### Open threads, most useful first

1. **Upload the fixed build** (above). Everything else is downstream.
2. **Rory's EcoMeter export.** The `pricing.html` tokens-per-message archetypes are still round-number *assumptions*, and they are the largest lever on every figure in the Break even column. Export v2 exists to fix this but needs a shipped build first. `billed_input_tokens_per_day ÷ user_turns_per_day` is the number to anchor to.
3. **A screenshot showing supported platforms.** The store description now points at one ("The screenshots below show the full list of supported platforms"). If it isn't uploaded, that's its own metadata problem — arguably worse than the original rejection.
4. **A human read of the store description.** It was rewritten across four commits (opening, a moved sentence, a changed bullet, markdown stripped). Each diff is sound; the flow has never had a human's eyes.
5. **RESOLVED 2026-08-24 — Mistral has rebranded Le Chat → "Vibe."** Confirmed on mistral.ai/pricing, which now lists Free / Pro $14.99 / Student Pro $5.99 / Team $24.99 under the Vibe name. Plan keys deliberately **not** renamed: they are the join key across `prices.json`, `plan-limits.json` and `audit.html`, and `check-prices.js` fails on a broken join. The rebrand is recorded in the plan's `note` instead. If it ever *is* renamed, all three files must change in one commit.
6. **`grok-build-0.1`** — rates now confirmed on docs.x.ai (2026-08-24): **$1/$2 short, $2/$4 above 200k**, 256k context. Still untracked, still a specialist build/agent model, and adding it still means inventing a `water.json` tier — but the rate is no longer a guess if we decide to. Same call as before: decide, don't default.
7. **`tiktoken-approx` / `sp-estimated` bands are still unmeasured guesses.** Validating needs the relevant tokenizer bundled. Don't quote them as measured.
8. **Consider wiring `check-prices.js` into `validate-site.yml`** so price drift can't come back. Left undecided because it changes CI behaviour on every PR.
9. **RESOLVED 2026-08-24 — `scripts/check-clock.js` exists.** Asserts fallback parity with `ai-clock.html`, brackets capex against big-four guidance and energy against the IEA figure, and applies a share bound catching any counter low enough to make one company an absurd fraction of the world total. Validated by replaying the PR #22 levels (fails at capex 34.9%, Google 80% of tokens). Anchors in `clock.json._meta.plausibility`; capex and energy only, by design. In CI.
10. **Watch whether the Ceiling column still earns its place.** It now computes for zero plans (see above) and renders "not disclosed" or a labelled third-party estimate everywhere. Kept deliberately — an empty column *is* the finding, and `_meta.disclosure_is_getting_worse` in `plan-limits.json` records the direction of travel. But if a future check finds providers have withdrawn the third-party-corroborated figures too, the column becomes 26 identical cells and should probably become a single sentence instead.
11. **REOPENED AND RESOLVED THE OTHER WAY 2026-08-24 — Google's free student year is BACK.** We recorded it as expired on 2026-08-08 and were right at the time; Google has since relaunched it (12mo AI Pro free in the US, AI Plus in 140+ markets, **claim by 2026-12-31**, SheerID). Confirmed on blog.google and support.google.com; `student-access.json` now carries it as `disclosed` with the auto-renew trap flagged. GitHub's Copilot student pause has also ended (confirmed on github.com/education/students). **The standing lesson is now recorded as a caveat in that file: a verified ABSENCE expires too, and a false negative costs the reader money while being invisible.** Still open: nobody has re-checked whether Google offers a *discounted* rate after the free year, and its student landing page is behind a sign-in — that one needs Rory signed in.
12. **The Auditor covers 5 of the 8 providers in `prices.json`** — DeepSeek added 2026-08-08; still no xAI, Perplexity or Mistral. **Perplexity is the one students ask about**, and it's the awkward one: its Sonar rates exclude a $5–14 per 1,000 requests fee that for chat-shaped use exceeds the token cost, so any figure the Auditor derived would be a substantial undercount and would need surfacing in the result itself, not a footnote. **Mistral** is the only provider publishing a student price ($5.99/mo, already in `prices.json`) but may have rebranded Le Chat → "Vibe", and plan names are the join key across three files. Adding a provider is now guarded by `check-auditor.js`.
13. **Revisit the tokens rate at the October re-anchor.** `5×/yr` matches near-term observation (Google disclosed 7× YoY at I/O 2026) but longer-range forecasts imply ~2.2×/yr. Kept at 5 because the model is re-anchored quarterly and explicitly isn't for multi-year extrapolation — but if the next anchor still shows 5× diverging from reality, that's the counter to cut. Full list of live judgement calls is in `clock.json` `_meta.open_questions`.
14. **Does Microsoft now publish per-campus water and power?** Third-party coverage (July 2026) says its full 2026 Environmental Sustainability Report breaks out both by named campus. We could not confirm it on a Microsoft-owned page on 2026-08-24 — the datacenter efficiency page still gives global/regional PUE and WUE only, and the report PDF was not machine-readable in our tooling. Left `red` and recorded as an open question in `transparency-index.json`. **If true it is the first grade movement this index has ever recorded and makes Microsoft the second per-site discloser after Google**, so it is worth the effort of opening that PDF properly.
15. **`datacenters.json` has 11 of 12 sites unverified since 2026-07-13.** Only `xai-colossus-1` was re-checked on 2026-08-24. The file-level `last_updated` was deliberately NOT bumped — bumping it after checking one site would claim a verification that did not happen; see `_meta.partial_verification`, and read the per-site `as_of` instead. This is the largest single block of stale data left in the repo.

---

## 1. What this is

**Legerly** gives AI users information providers don't surface — true cost, environmental footprint, and which plan fits real usage. AI is a market failure built on asymmetric information; the mission is to close that gap so the *consumer* captures the benefit. One repo, two products:

- **The Legerly website** (`legerlyai.com`) — static pages served by **GitHub Pages from `main`** (root).
- **EcoMeter AI** — a Manifest V3 **Chrome extension** in `extension/`, published to the Chrome Web Store.

**Design principles**
- **Privacy-first:** nothing is transmitted off-device except **optional, opt-in provider token-count calls** (Anthropic for Claude, Google for Gemini — each **off by default**, key-gated, user-messages-only); usage tracking is opt-in and local-only.
- **Full transparency, including about ourselves:** never present modeled/estimated figures as measured; label estimates, cite sources. ("Not disclosed" is a finding.)
- **No build step, no framework, no CDN:** every page is a self-contained HTML file; fonts load from Google Fonts (the one privacy wart — see Open Items).
- **`prices.json` is the single source of truth** for model prices, shared by extension + website.
- **Reactive versioning:** the publish workflow bumps the extension version only when the store rejects a duplicate.

---

## 2. Repo layout

```
index.html                Homepage (tool cards)
pricing.html              AI Price Tracker (per-token / subscriptions / free-tier)
ai-clock.html             The AI Clock (live global-AI-usage counters)
audit.html                Subscription Auditor (quiz → plan recommendation)
transparency-index.html   AI Transparency Index (env-impact scoring + disclosure matrix)
clock.json                AI Clock anchor levels + growth rates
transparency-index.json   Transparency page copy (_meta) + the disclosure-quality matrix
datacenters.json          Per-site AI-datacenter environmental data (the scored env axis)
CNAME                     legerlyai.com
PROJECT-CONTEXT.md        (this file)

extension/                The Chrome extension (load THIS folder unpacked)
  manifest.json             MV3, version 6.12  (host perms incl. generativelanguage.googleapis.com)
  STORE-LISTING.md          Paste-ready store description + pre-upload checklist
  STORE-SUBMISSION.md       Paste-ready privacy practices + per-permission justifications
  sidepanel.html/.js        The side-panel UI + all logic
  content.js                Scrapes visible chat text per platform
  background.js             Service worker (message routing)
  prices.json               SHARED data: { _meta, api, subscriptions, free_tiers }
  water.json                Per-model water intensity tiers
  privacy-policy.html       Privacy policy (also linked from the site)
  tokenizer_cl100k/o200k.js Bundled tiktoken tokenizers (lazy-loaded)
  tokenizer_hf.js           Exact-local byte-BPE encoder (self-verifying; DeepSeek)
  tokenizers/               Staged exact-local assets + reference.json + README
  icons/ fonts/

scripts/
  update-prices.js          Writes prices.json api section (hardcoded values)
  bump-version.js           Increments manifest version (reactive)
  roll-clock.js             Rolls clock.json anchor forward
  fetch-tokenizers.js       Stages real provider tokenizer assets for exact-local counts
  validate-site.js          Pre-deploy sanity check for the static site
  deploy.sh

.github/workflows/
  publish.yml               Weekly: refresh prices → build (stages tokenizer assets if configured) → CWS draft
  update-prices.yml         Manual PR-based price updates (cron disabled)
  release.yml               On push: build zip + GitHub Release + artifact
  roll-clock.yml            Quarterly: roll the AI Clock anchor, open a PR
  validate-site.yml         PR/push to main: run validate-site.js
```

---

## 3. The website (`legerlyai.com`)

Served by GitHub Pages from `main` root. **Ship a website change: merge to `main` → Pages redeploys** (watch `pages-build-deployment`; hard-refresh to bust cache).

| Page | What it does | Data source |
|---|---|---|
| `index.html` | Homepage + tool cards; links the live tools + the EcoMeter store listing. | — |
| `pricing.html` | AI Price Tracker — Per-token (API), Subscriptions, Free tier. | fetches `/extension/prices.json` |
| `ai-clock.html` | The AI Clock — live-ticking global AI usage/footprint counters. | fetches `/clock.json` |
| `audit.html` | Subscription Auditor (§6). | fetches `/extension/prices.json` |
| `transparency-index.html` | AI Transparency Index (§7). | fetches `/datacenters.json` + `/transparency-index.json` |

### 3a. Subscriptions view — Break even / Ceiling (added 2026-07-28)

Two computed columns answering "what is this plan actually worth", from `plan-limits.json` + live API rates.

- **Break even** — how long a day you'd have to use the plan before it beats paying per token at that provider's own API rates, shown as a **time** (`19 min–2.1 h /day`) with the message count beneath. Needs no limit data at all, so it works for all 26 plans. This is the column that actually informs a decision. **`audit.html` now shows the same figure on any paid recommendation** (§6) — the two implementations are asserted equal by `test-auditor.js`, so changing the maths here without changing it there fails CI.
- **Ceiling** — the upper bound if the cap were hit every window, every day, for 30 days. **As of 2026-08-08 this computes for zero plans**: OpenAI withdrew the only published general cap, and Go's surviving 10-Thinking-messages/5h figure is `scope_limited` so `capPerDay()` refuses it. Rows now show "not disclosed" or a labelled third-party estimate. Keep the column — the emptiness is the finding, and the copy says so.
- **"Usage style"** selector (light/standard/heavy) re-runs both against different tokens-per-message archetypes; **"show the math"** expands per row to every input, the provider's own wording, and sources.

**Why the ceiling is framed the way it is.** Computed straight, it produces things like *ChatGPT Pro (20×) → $26,880/mo, 134× the price*. That's arithmetically correct from disclosed figures and useless — it needs 17.8 days of nonstop messaging per day. So the ceiling is rendered **in time as well as dollars**, and where the required time exceeds waking hours it says so in gold: *"more than anyone is awake for."* The absurdity is the finding — it shows the cap isn't what limits the plan's value to you, your time is. **Don't quietly drop the time framing to make the number look cleaner; without it the column is upsell copy.**

⚠️ **The tokens-per-message archetypes are assumptions, not measurements**, and they are the largest lever on every figure. They're labelled as assumptions in `_meta.archetypes`, in the footer, and in every expander. The intended fix is to anchor them to real EcoMeter usage exports. **Until that lands, nothing may describe them as measured.**

All pages share the dark theme (`--bg:#0a0f0d`, greens `#4caf82`/`#38c9a0`, gold `#d4a843`) and Syne / Inter / DM Mono fonts. Pattern: same-origin `fetch` + client-side render with an inline `FALLBACK`.

---

## 4. EcoMeter AI extension

MV3 side-panel extension tracking token usage, cost, and water impact across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, DeepSeek.

- **Store listing:** https://chromewebstore.google.com/detail/ecometer-ai-%E2%80%94-resource-tr/angbjmkjocdkfdppnpoemfkdjphenbbj (ID `angbjmkjocdkfdppnpoemfkdjphenbbj`).
- **Model picker:** full catalog (`MODEL_CATALOG`), prices resolved from `prices.json` `api`.
- **Usage tracking (opt-in, local, feeds the Auditor):** see §6.

### Tokenizer accuracy (`countTokens` / `getEncodingForModel`)
Counting is a priority chain: **opt-in provider API → exact-local tokenizer → tiktoken (exact/proxy) → calibrated estimate.** Each count returns `{count, method, err}`; `METHOD_ACCURACY` maps method → error band, surfaced as **"±X% token estimate" / "✓ exact tokenizer"** in the stats.

- **Exact:** OpenAI & Copilot → bundled **tiktoken o200k/cl100k**. Claude → **opt-in Anthropic count API** (else cl100k proxy).
- **Opt-in Google (Gemini):** `countTokensGoogleAPI` → `generativelanguage.googleapis.com/…:countTokens`, gated on an **optional** Google key (off by default, session-only, user messages only; UI = "🎯 Exact token counts" panel). Disclosed in `privacy-policy.html`; manifest host permission added.
- **Proxies / estimates:** DeepSeek/Mistral/Grok/Perplexity → cl100k proxy (`tiktoken-approx`); Gemini offline → SentencePiece estimate; unknown/wrapper → char-ratio.
- **2026 recalibration (measured):** char-ratio & SP estimators were tuned against real tiktoken on a mixed corpus — **MAE ~32%/+31% bias → ~8%/~0 bias**. Also fixed a routing bug: **GPT-5.x fell through to char-ratio** (~30% overcount on ChatGPT/Copilot) → now o200k.
- **Exact-local (Phase 3, scaffolded, OFF until verified):** `scripts/fetch-tokenizers.js` stages real assets; `tokenizer_hf.js` is a self-verifying byte-BPE encoder (DeepSeek) that registers via `registerExactTokenizer`/`exactLocalCount` **only if it reproduces `tokenizers/reference.json` counts exactly** — so it can never present an unverified count as exact. `publish.yml` bundles the (git-ignored, multi-MB) assets at build time **only when `reference.json` is committed** (optional `HF_TOKEN` secret for license-gated Gemma/Mistral). Tekken/Gemma are documented drop-in points. See `extension/tokenizers/README.md`. Also: system-prompt overhead, reasoning-token multipliers (o3/R1), and image tokens are modeled separately — "exact" is about *text*, billing overhead is on top.

**Two accuracy bugs fixed 2026-07-28 — both were mislabelling, which is the failure mode this project least tolerates:**
- **`countTokensAnthropicAPI()` ignored the selected model.** Every Claude request went to `count_tokens` hardcoded as `claude-haiku-4-5-20251001`, and the result was still labelled "✓ exact tokenizer". Claude models do **not** share a tokenizer — Opus 4.7 introduced a new one now used by Opus 4.8 / Opus 5 / Sonnet 5 / Fable 5 / Mythos 5 — so frontier-model counts were wrong *while presented as certain*. Now passes `modelKey` through; an id the API rejects falls back to the cl100k proxy and is correctly labelled an estimate. **If you add a model to the picker, its key must be a valid Anthropic API model id** or exact counts silently degrade for it.
- **System-prompt overhead was charged once per conversation**, not once per turn. It is re-sent on every API call, so the undercount grew with length. Now `overhead × user-turn count`. Turn count uses `m.role === 'user'`, the same discriminator as the input-token filter — if the scraper's role strings ever change, this silently returns 0 and the fix becomes a no-op.

**Two cost-model bugs found and fixed 2026-07-29 by testing against ground truth — reading the code did not reveal either.** Both were large, both inflated the headline "true cost", and both are now covered by `scripts/test-cost-model.js` (31 assertions, zero deps, exits non-zero — run it after touching the cost path).
- **Billed input was charged at ~2×** (2.21× for document-heavy chats). `estimateConversationReplay()` accumulated a context snapshot after *every* message, but a request happens once per **user** turn — and it counted the final reply, which is generated and never re-sent. The caller then added every user message a second time on top of a replay total that already contained it. Replaced by `estimateBilledInput()`, which returns the complete input bill (`Σ over user turns of prior + this turn`) and must **not** have `inp` added to it. Verified exact against hand-computed truth on seven conversation shapes.
- **Claude image tokens were ~51× too high.** The formula used 32px patches × 65; Anthropic documents **28px patches at one token per patch** (`⌈w/28⌉ × ⌈h/28⌉`), with downscaling to a tier cap (standard 1568 tokens / 1568px long edge; **Claude 4.7+ get a high-resolution tier**, 4784 / 2576px). Now matches all 12 rows of Anthropic's published worked table exactly. The old *fallback* constant (1600) was roughly right, which is what made the discrepancy visible.

**Methods that remain unverified — do not present these as measured.**
- **`PLATFORM_OVERHEAD_TOKENS`** (1,500–8,000/turn by platform) are undocumented estimates with no cited source. They scale with turn count, so they move the total materially.
- **`REASONING_RANGES`** are wide guesses (`lo`/`hi` spans of 1–8×) and the midpoint drives the cost. `deepseek-v4-flash` carries a 2.5× reasoning multiplier, which looks wrong for a "flash" model.
- ~~The "recalibrated 2026, MAE 32%→8%" claim has no reproducible artefact~~ — **resolved 2026-08-02.** `scripts/calibrate-tokenizer.js` now measures the char-ratio estimator against the bundled real cl100k over a corpus built deterministically from this repo. The claim did not hold: measured **12.9% MAE with a systematic −9.4% undercount bias**, not 8% and ~0 bias. The prose ratio of 4.8 chars/token was well above what cl100k does to English prose (~4.0). Recalibrated to measured ratios (prose 4.0, code-heavy 3.7, URLs 3.5) → **10.5% MAE, +2.2% bias**, and `METHOD_ACCURACY.estimated` widened 8% → 11% to match. The script **exits non-zero if the advertised band is optimistic**, so this can't silently rot again. Re-run it after touching any ratio.
  - **The band is mean error, not worst case** — p95 ≈24%, worst ≈42% on code-heavy text. The UI's "±11%" is a typical-case figure.
  - **`tiktoken-approx` and `sp-estimated` are still unmeasured guesses.** Validating them needs the relevant tokenizer bundled (Gemma for SentencePiece, per-family BPEs for the rest) — comparing to cl100k would measure the gap between two tokenizers, not the estimator. Don't quote them as measured.
  - **Corpus caveat:** it's this repo's own technical prose and JavaScript, so it under-represents casual chat. The direction of the fix (4.8 → 4.0 for prose) is robust regardless, but the exact MAE is corpus-specific.
- **Images are charged once, not per turn**, though they are re-sent with the transcript like everything else — an undercount in the opposite direction to the two bugs above.

**Still not modelled: prompt caching.** Cached input bills ~0.1×, and long conversations are where providers cache most — so EcoMeter **overestimates, and the gap widens with length**. Deliberately not modelled: no provider publishes per-conversation hit rates, and a guessed number would look precise without being true. Disclosed in the panel disclaimer with its direction and the reason.

---

## 5. Shared & site data files

### `extension/prices.json` — single source of truth
```jsonc
{ "_meta": { "last_updated", "version", "source", "caveats"? },
  "api":   { "<provider>": { "<model-key>": { "input": <$/token>, "output": <$/token> } } },
  "subscriptions": [ { "p", "m", "price", "note"? } ],
  "free_tiers":    { "<provider>": { "label", "note", "models": [ { "key", "name", "note"? } ] } } }
```
Consumed by the extension (`api` → cost), `pricing.html` (all sections), `audit.html` (prices + free-tier access).

- **`_meta.caveats`** (added 2026-07-28) records per-model pricing caveats a bare number can't carry. Currently holds the **Sonnet 5 introductory rate: $2/$10 is promotional and reverts to $3/$15 after 2026-08-31** — it was previously listed as if permanent. Surfaced on `pricing.html` as a note; also flagged in a comment in `update-prices.js`. **Re-check that line after 2026-08-31.**
- `update-prices.js` **merges** into the existing file (it mutates `api[provider][model]` and only rewrites `_meta.last_updated`), so hand-written `_meta` keys and models absent from its hardcoded table survive a run. Verified by executing it against a backup — zero diff.
- **Price audit 2026-07-28 — every rate re-verified against provider-owned pages.** Three were wrong: `gemini-3.5-flash` $0.50/$3.00 → **$1.50/$9.00** (it held Gemini 3 Flash Preview's price), `deepseek-v4-pro` $1.74/$3.48 → **$0.435/$0.87** (exactly 4× out), `grok-4.20` $2.00/$6.00 → **$1.25/$2.50** (it held grok-4.5's price). Added the GPT-5.6 family, Gemini 3.6 / 3.5 Flash-Lite, Grok 4.5, Opus 4.5, Sonnet 4.5.
- **⚠️ Five places must agree on a price, and three drift silently — run `node scripts/check-prices.js` after ANY price change.** `prices.json` is the source of truth, but `pricing.html`'s `FALLBACK_PRICES` and `update-prices.js`'s hardcoded tables each hold their own copy. Before this audit `FALLBACK_PRICES` had Gemini **right** while `prices.json` had it **wrong**, and Mistral Large 3 the other way round — so the page showed different prices depending on whether the fetch succeeded; `update-prices.js` would additionally have **reverted** the Gemini fix on its next weekly run. The script checks price↔water parity, plan-limits joins, registry↔prices, fallback↔prices (including long tiers), picker↔prices, and updater↔prices. It exits non-zero, so it can gate CI.
- **Long-context tiers are modelled** (`api.<model>.long = { over, input, output }`). OpenAI (>272k input tokens), Google (>200k) and xAI (≥200k) charge ~2× past a threshold, and **the higher rate applies to every token in the request**, not just the excess. Anthropic doesn't tier this way and has no `long` block.
  - **The tier belongs to a single API call, not to a conversation.** Each turn resends the whole history plus the system prompt, so a long chat crosses partway through and every later turn bills higher. `blendedInputRate()` in `sidepanel.js` walks the turns and returns the token-weighted average; charging one flat tier would be wrong in both directions. A consumer that ignores `long` undercounts long chats by ~2×.
  - This pushes the **same** way as no other correction we apply — notably it does **not** offset the unmodelled prompt-caching discount. Don't net them off.
- **Perplexity Sonar token rates are right but incomplete** — $5–$14 per 1,000 requests on top, which for chat-shaped use exceeds the token cost. Any Perplexity figure from this file is a substantial undercount.
- **A model must exist in BOTH `prices.json` and `water.json`.** A key missing from `water.json` renders no water figure at all, silently — that gap had accumulated for 9 models before 2026-07-28. Cross-check with: every key in the extension's `MODEL_CATALOG` resolves in both files.

### `plan-limits.json` — what each plan allows, and how well it's disclosed
Drives the **Break even / Ceiling** columns on `pricing.html` (§3a). Joins to `prices.json.subscriptions` on **`p` + `m` (exact string match)** — if you rename a plan in one file, rename it in both or the row silently loses its columns. Rates are deliberately **not** stored here; they're read from `prices.json.api` at render time, so the figures re-price themselves when API prices move (including when Sonnet 5's intro rate expires).

```jsonc
{ "_meta": { "last_verified", "month_days", "archetypes", "throughput", "provenance_legend", "finding", "caveats" },
  "plans": [ { "p", "m", "provenance", "caps"?, "multiplier"?, "third_party"?, "stated"?, "value_models", "source"?, "as_of" } ] }
```
- **`provenance`** is the point of the file: `disclosed` (provider publishes it about its own product) · `derived` (disclosed cap × disclosed multiplier) · `third_party` · `not_disclosed`. Rendered as a first-class state — a blank cell is a finding, not a gap.
- **`multiplier.base_disclosed: false`** is what stops Anthropic's "5× Pro" and Google's "4× standard" from being silently treated as real numbers. `capPerDay()` refuses to follow a multiplier chain that doesn't terminate in a published absolute. Don't "fix" this by inventing a base.
- **`value_models.low/high` are labels, not an ordering** — several plans pair a flagship with a pricier reasoning variant. `breakEven()` sorts by computed cost, not by the key name.

### 5a. `student-access.json` — what students and teachers actually get
Added 2026-08-08 for the student-facing launch. Read by `audit.html` when the user answers "student" or "teacher" (question 8 of 11); renders a panel of routes for the tools they picked, plus any `disclosed` offer elsewhere, plus — for teachers only — routes flagged `teacher_offer`. Joins `prices.json.subscriptions` on `p`.

**The finding is that the discounts mostly aren't real.** Of eight providers, exactly one publishes a student price on its own site (Mistral, $5.99/mo). OpenAI and Anthropic offer individuals nothing; what they have is institutional and invisible unless your campus tells you. So the panel's actual payload is an action, not a price: *ask your university IT desk or library whether they already pay for one of these.*

- **`provenance`** — `disclosed` (say it as fact) · `institutional` (real but unbuyable by a person) · `unverified` (reported, unconfirmed on a provider page — never state as fact) · `paused` · `none` (checked, nothing exists — a finding). `check-auditor.js` refuses a `disclosed` route with no source.
- **⚠️ `partner_institutions` is EXAMPLES, never a directory.** Anthropic publishes nine logos, no list, no terms, and Syracuse's own release calls itself "one of the first" — so any snapshot is incomplete and growing. Rendering it as a lookup would tell a student at an unlisted school they can't get access, which is both false and the exact failure mode this project exists to prevent. `not_exhaustive: true` is enforced, and the guard also asserts `audit.html` still carries the "not a directory" wording.
- **Nothing here came from a third-party blog**, deliberately — that whole genre is wrong about the base prices, never mind the discounts. `_meta.caveats` records why.

### `clock.json` — AI Clock model
`{ _meta:{anchor,last_rolled,reanchor_log,open_questions,sources}, scenarios:{conservative|moderate|high}, rates }`. **Re-anchored 2026-08-08** (off-cycle, against fresh disclosures). Two-force projection (volume up, per-unit cost down); rolled quarterly by `roll-clock.yml` (opens a PR for a human to drop in fresh disclosures).
- `_meta.reanchor_log` records what changed and why at each human re-anchor; `_meta.open_questions` carries the unresolved judgement calls forward to the next one. Read both before re-anchoring — they're the handoff.
- **The inline `SCENARIOS`/`RATES` block in `ai-clock.html` is a fallback copy of `clock.json`.** Update both together, or a failed fetch silently serves stale numbers.
- The `_meta.anchor` date is **rendered into the page copy** (`#anchor-date`) — never hardcode the anchor date in prose again; it drifted unnoticed for a full quarter.
- **There is deliberately no unit-cost decline rate in this file** (there was until 2026-08-08; nothing read it). The per-unit panel derives its own decline from `rates.spend / rates.tokens`. `_meta.why_no_unit_cost_field` explains why Epoch's ~40×/yr figure measures a different quantity and isn't used — read it before re-adding one.

### `transparency-index.json` — Transparency page copy + disclosure matrix
`_meta` holds **page-level** copy (title, lede, `last_verified`, the 4-state `grade_legend`, `axes`, `methodology`, `caveats`) **plus** a nested `detail` block (its own 3-state legend/note) for the matrix. `columns`/`rows` = the 7-provider × 6-dimension **disclosure-quality matrix**. See §7.

### `datacenters.json` — per-site AI-datacenter environmental data
`{ _meta:{last_updated, methodology_note}, sites:[…] }`. Each site: `provider`, `name`, `location`, `power_mw` (+optional `power_mw_planned`), `water_grade` (transparent|partial|opaque), `water_note`, `sources[]`, `as_of`. `transparency-index.html` computes provider grades from this. See §7.

### `extension/water.json` — per-**token** model water-intensity tiers (extension only). Distinct from `datacenters.json` (per-**facility**).

---

## 6. The Subscription Auditor + EcoMeter loop (marquee feature)

**`audit.html`** — a client-side quiz recommending the plan/tier/free option that fits real usage.

- **11 questions:** 7 usage → a **5-level classification** (Dabbler → … → Power user); then current-spend, student/teacher status (§5a), team, priority. Only the 7 usage answers score — `classify()` reads `SCORE`'s keys, so adding a non-scoring question is safe.
- **Engine** (`recommend()`): for each provider, picks the cheapest tier clearing your **volume** (× a limit-hit headroom factor), **model access** and **regular image/video work**, flags over/under-payment vs. current spend, and does the **volume-aware downgrade** (below).
- **Plan metadata** (caps/models/features/seats) is inline in `audit.html`; **prices sync live** from `prices.json`, free-tier model lists from `free_tiers`.
- **Every cap carries a `capSource`** — `disclosed` · `third_party` · `estimate` · `not_disclosed` — and the result tells the reader which it's looking at. Only `disclosed` may be stated as the provider's own figure, and `check-auditor.js` refuses to let a plan claim `disclosed` unless `plan-limits.json` actually holds a published absolute for it. **Where volume alone pushes someone up a tier and that cap isn't `disclosed`, the result says so, names the cheaper tier, and tells them to start there** — the caps are the weakest input in the whole tool and must never read as fact.
- **`TOP_IS_FREE`** marks providers whose best model is already free (Google, Microsoft), so "I always want the best" can't push them onto a plan that buys no better model. **`LEGACY_ONLY`** marks providers with no comparable per-token rate (Microsoft), so no API cost is quoted — matching `plan-limits.json`'s `no_api_rate`.
- **`ADVANCED` is derived from `PLANS`**, not hardcoded, so a provider changing its free tier re-derives what counts as frontier use. A static list silently mis-read export data for a week.
- **Break even, joined to the subscriptions table (added 2026-08-08).** Any recommendation of a *paid* tier now also carries the same "break even at" figure `pricing.html` shows for that plan — time per day, message counts, and both value models — read from `plan-limits.json` on the same `p` + `m` join. Then it says the thing a table can't: where *this* user sits against it ("Your estimated 12 messages/day is below break-even on both — so what you're buying isn't volume, it's the models the cheaper tiers don't carry"). Free recommendations get no line; there is nothing to break even on.
  - **With an EcoMeter export it re-prices off measured message sizes** (`billed_input ÷ messages`) instead of the archetype, and says so. This is the anchoring §3a's archetypes have been waiting for — the same idea, applied per-user rather than to the published table.
  - **`breakEven()` is a second implementation of `pricing.html`'s.** `test-auditor.js` loads *both pages'* engines and asserts they return identical numbers for every plan × archetype, so this copy cannot drift from the table it exists to match. It also forces an archetype past the long-context threshold, because that branch is dormant at today's archetypes and output comparison alone would not notice it disappearing.
  - `ARCHETYPE` in `audit.html` is now only a **fallback** for a failed fetch; the live values come from `plan-limits.json`. `check-auditor.js` asserts the fallback still matches, and that every `value_models` key has a display label (or its raw key — `claude-haiku-4-5-20251001` — is shown to the reader).
- **Run `node scripts/check-auditor.js` after touching `audit.html`, `prices.json` or `plan-limits.json`** — `check-prices.js` does not read `audit.html`.

**Per-model cost + generalised downgrade**
- `apiCostPerMonth(pf, only?)` prices **each model at its own rate** (rates for ~50 models pulled from `prices.json.api`), not all tokens at one rate.
- The downgrade is generalised from "free + API" to **any tier below `fit` + API for the models it lacks** — so occasional Opus/o3 use recommends e.g. *"ChatGPT Go + API for o3"* instead of jumping to Plus. Decided by real per-model cost (heavy premium use fails the test naturally — no threshold).

**EcoMeter → Auditor data path**
1. Opt into **"Usage tracking"** (📊 panel, off by default).
2. `accumulateUsage()` keeps a **local, lifetime** tally per platform/model — **counts + tokens only, no content**.
3. **⤓ Export for Auditor** downloads `ecometer-usage.json`.
4. `audit.html` **Connect usage** reads it **in-browser** (FileReader — never uploaded) and pre-fills the quiz with measured models/volume.

**`ecometer-usage.json` schema (v2 — 2026-07-29)**
```jsonc
{ "app":"EcoMeter AI","kind":"usage-export","version":2,"scope":"lifetime",
  "generated":"YYYY-MM-DD","days_tracked":N,
  "platforms":[ { "provider","messages_per_day","input_tokens_per_day","output_tokens_per_day",
                  "billed_input_tokens_per_day","user_turns_per_day","billed_days",   // v2, optional
                  "total_messages","active_days","models_used":[...],
                  "model_usage":[ { "key","input_tokens_per_day","output_tokens_per_day",
                                    "billed_input_tokens_per_day","user_turns_per_day" } ]
  } ] }
```
⚠️ **`input_tokens_per_day` is VISIBLE text only** — what you typed. It is not what you're charged for: every turn resends the transcript, so real input is several times larger and grows with conversation length. **v2 adds `billed_input_tokens_per_day`**, the figure `estimateBilledInput()` computes, which is the one to use for any cost or plan-fit comparison. `audit.html` prefers it and falls back to the visible figure for v1 exports.
- **`billed_input_tokens_per_day ÷ user_turns_per_day` = billed input per message** — the number the `pricing.html` archetypes should be anchored to. It **excludes** the per-turn system-prompt overhead, because that's a modelled constant rather than a measurement (§4); add `PLATFORM_OVERHEAD_TOKENS` yourself if you want it, and say that you did.
- The v2 fields are **omitted, not zeroed**, when nothing has been recorded since they were added, and are averaged over `billed_days` rather than `active_days` — otherwise pre-v2 history dilutes the average toward zero. A reader must treat absent as "not measured", never as 0.
Volume is averaged **per active day**, **lifetime**. The optional **`model_usage[]`** (per-model token split) is what lets the Auditor price each model at its own rate; the extension already tracks per-model internally, so it's an export-format addition. Without it the Auditor prices conservatively (all tokens at the priciest used model's rate) — never a false downgrade.

**Panel UI (reworked 2026-07-28).** The usage tally and the exact-count keys used to be two separate `<details>` panels; they're now **one "📊 Usage & accuracy" panel**, since both exist for the same reason — making the exported numbers real. Consequences worth knowing:
- **Both API-key fields (Anthropic + Google) are inline in that panel**, each with Save/Clear and independent status. Previously the Anthropic key could only be entered on the setup screen.
- **`remove key` (`logoutBtn`) is a full forget-me** — it wipes usage history, model choice, setup state and session storage. It is *not* a way to re-enter a key. The new **`setup` link** beside it returns to the welcome screen non-destructively; use that.
- **Keys live in `chrome.storage.session`, `setupDone` in `chrome.storage.local`.** So after an extension reload or browser restart the keys are gone but setup is still "done" — the user lands on the tracker silently downgraded to estimates. That's deliberate (keys never touch disk), but it *looks* like a bug. The panel copy now explains it and offers inline re-entry.
- The panel's `summary::after` CSS already appends "for the Subscription Auditor" — don't repeat it in the `<summary>` text.

---

## 7. The AI Transparency Index (`transparency-index.html`)

Grades **how openly** providers let the public see what their AI costs — transparency, not the footprint. Three **independent** axes, never averaged:

| Axis | Status |
|---|---|
| **Environmental impact** | **Scored** — per-site, capacity-weighted (below) |
| Pricing | ⚪ Not yet scored |
| Data practices | ⚪ Not yet scored |

**Two coexisting scales — deliberate, don't "fix" it.** The page grades **public knowability** on a **4-state** scale: 🟢 Transparent (company discloses itself) · 🟡 Partial (a real figure is public but only via a regulator/utility/watchdog) · 🔴 Opaque (nothing public) · ⚪ Not yet assessed. **Below** the summary is the older **"Disclosure quality by dimension"** matrix (7 providers × 6 dimensions) with its **own 3-state legend** (it grades a company's *own* self-reporting completeness). Same provider can read 🟡 up top and 🔴 in the matrix — the matrix's lead-in explains the different lens. Its rows were **not** re-graded when the page adopted the knowability scale.

**Scoring (computed in `renderEnv()` from `datacenters.json`):** water_grade → value transparent 3 / partial 2 / opaque 1; **no grade ⇒ excluded**. `providerScore = Σ(value × power_mw) / Σ(power_mw)` over that provider's assessed sites with non-null MW; null-MW sites display but don't move the average. Buckets: ≥2.5 🟢 · 1.5–2.49 🟡 · <1.5 🔴 · none ⚪. Each provider card is a `<details>` with expandable **"show the math"**; every site links sources.

**Coverage:** **12 sites / 7 providers** (Google 🟢, Amazon/Anthropic 🟡, xAI 🟡, Oracle/OpenAI 🟡, Microsoft 🔴, Meta 🔴, CoreWeave 🔴), `last_verified: 2026-07-13`. Grades were hardened through a watchdog-then-primary-source pass (e.g. Meta Hyperion & Amazon Canton corrected 🔴→🟡 on permit/utility figures; Microsoft Atlanta 🔴 on no site figure). Colocation landlords (Equinix/NTT/CyrusOne) aren't scored yet (they publish fleet-wide efficiency, not per-AI-site figures).

---

## 8. Automation (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `publish.yml` | Mon 09:15 UTC + manual | Refresh prices → if changed (or manual), **stage exact-local tokenizer assets** (only if `reference.json` committed) → build → upload draft to CWS → tag + open a "ready to publish" issue. **Reactive versioning:** only bumps on `PKG_INVALID_VERSION_NUMBER`. |
| `update-prices.yml` | Manual only | PR-based price refresh. |
| `release.yml` | Push to `main` | Build zip + GitHub Release + 30-day artifact. |
| `roll-clock.yml` | Quarterly + manual | Roll `clock.json` anchor; open a re-anchor PR. Last roll 2026-08-08. |
| `validate-site.yml` | PR into `main` (`**.html`/`**.json`) + push | Runs `scripts/validate-site.js`: zero-dep no-build gate (doctype, balanced tags, broken local refs, malformed JSON). |

**Secrets:** `CWS_CLIENT_ID/SECRET/REFRESH_TOKEN/EXTENSION_ID`; optional **`HF_TOKEN`** (license-gated tokenizer repos). ⚠️ The Google OAuth **consent screen must be "Production"** or the refresh token expires every 7 days.

---

## 9. Recent work (this session, 2026-07-13)

- **AI Transparency Index — environmental axis:** built `datacenters.json` + the capacity-weighted `renderEnv()` engine + three-axis framing; adopted a public-knowability 4-state scale and nested the existing disclosure matrix beneath it; expanded to **12 sites / 7 providers** with a watchdog-then-primary sourcing pass that corrected several grades. *(merged)*
- **EcoMeter tokenizer accuracy:** measured + recalibrated the estimators (32%→8%), fixed the GPT-5→o200k routing bug, added `METHOD_ACCURACY` error bands + a UI accuracy line, added **opt-in Google `countTokens`** (with privacy-policy + principle updates), and scaffolded the self-verifying **exact-local** tokenizer path + `fetch-tokenizers.js` + publish-time staging. *(merged, PR #17)*
- **Subscription Auditor — per-model cost:** `apiCostPerMonth(pf, only)` prices per-model; the downgrade generalised to any tier + API.
- **EcoMeter export — `model_usage[]`:** per-model token split so the Auditor prices exactly.
- **`validate-site` CI gate.**

### This session (2026-07-28, PR #18)
- **Claude Opus 5** across catalog, picker, pricing page, Auditor, and the price updater (§0).
- **Two token-accuracy fixes** — hardcoded count-API model id, and per-conversation vs per-turn overhead (§4).
- **Merged Auditor panel** with inline key entry + non-destructive `setup` link (§6).
- **Sonnet 5 intro-rate caveat** + `_meta.caveats` (§5); 9 missing `water.json` models; `update-prices.js` gaps.
- **Store docs** — `STORE-SUBMISSION.md` created, `STORE-LISTING.md` rewritten, privacy policy corrected (§10).
- **v6.12 submitted to the store 2026-07-28.**

### This session (2026-08-02, PRs #20 + #21)

Full summary in §0. The short version, and the lesson worth carrying:

- **Break even / Ceiling columns** on `pricing.html` + `plan-limits.json` (§3a, §5).
- **Two large cost-model bugs** — billed input ~2×, Claude image tokens ~51× (§4).
- **Three wrong API prices, plus fallback/source disagreement in both directions** (§5).
- **Long-context tiers modelled**; **usage export v2** carrying billed input (§5, §6).
- **The "±8% tokenizer accuracy" claim was false** — measured 12.9%; recalibrated and the band widened to 11% (§4).
- **Four guard scripts** now exist; all pass on `main`.

**The lesson:** every one of these was found by *testing a stated number against an independent source*, never by reading the code. The 2× and 51× bugs both sat in well-commented functions whose comments confidently described the wrong behaviour. The ±8% claim was asserted in a comment for months. Prices had drifted between four files that each looked internally fine. **When something here states a figure — an accuracy band, a price, a token count — assume it is unverified until a script checks it, and prefer writing the script to reading the code.**

### This session (2026-08-08, PR #22) — AI Clock re-anchor

Full summary in §0. The short version:

- **Capex overstated ~35%, tokens understated ~2×** — both level errors; every growth rate was defensible (§5).
- **Anchor date had been hardcoded** in the methodology copy and was stale for a full quarter; now rendered from `_meta.anchor`.
- **Two factual errors in page copy** — fleet ">10 GW" vs Epoch's ~30 GW, user growth "~2×/yr" vs actual ~1.3×.
- **CO₂ prose contradicted the CO₂ numbers**; kept the levels, fixed the claim.
- **Dead `unitCost` fields removed** and the per-unit panel documented as derived, not measured.
- **`_meta.reanchor_log` + `_meta.open_questions`** added to `clock.json` to carry reasoning between quarterly re-anchors.

**The lesson, which sharpens the one above:** the 2026-08-02 session's rule was "assume a stated figure is unverified until a script checks it." This session found the *next* layer — **a figure can pass every script and still be wrong, because the scripts check form, not plausibility.** `validate-site.js` was perfectly happy with a capex level 35% above what four companies had publicly guided. Worse, the correct number was sitting in the prose *next to* the wrong one, and in `clock.json`'s own `_meta` in the case of the 30 GW figure. **Where a file carries both a number and a sentence describing it, check them against each other — divergence between the two is a reliable smell, and cheaper to spot than either error alone.**

---

## 10. Open items / caveats

- **⚠️ The store build is materially wrong and the fix is unshipped — see §0.** A pre-2026-08-02 build was submitted, carrying the ~2× billed-input and ~51× image-token bugs and the false ±8% band. Get the store status before doing anything else.
- **v6.12 was rejected 2026-07-29 for listing copy, not code** (excessive keywords — the nine-platform list). Copy is fixed; **re-upload is unblocked**. When resubmitting: it still adds the `generativelanguage.googleapis.com` host permission, so expect permission re-review and a user-facing notice regardless. **Name supported platforms at most once, in prose, and never in the short description** — the standing rule is at the top of `extension/STORE-LISTING.md`.
- **Sonnet 5's intro rate is now PERMANENT** — Anthropic cancelled the 2026-09-01 rise to $3/$15 and $2/$10 is the standard price (its pricing page, 2026-08-24). This was the nearest-term dated task in this file; there is nothing to do on 31 August.
- **`grok-build-0.1`, Sonar Deep Research, Magistral / Devstral / Ministral and Codex are deliberately untracked** — specialist or non-consumer-chat models. Adding any means inventing a `water.json` tier, so decide rather than default.
- **Mistral HAS rebranded Le Chat → "Vibe"** (confirmed 2026-08-24). Plan keys deliberately unchanged — they are the join key across `prices.json`, `plan-limits.json` and `audit.html`; the rebrand lives in the plan `note`. Renaming means changing all three in one commit.
- **Google AI Ultra's "5× Pro limits" note is now sourced** — gemini.google/subscriptions states the $99.99 tier at 5× and the $199.99 tier at up to 20×, so the note matches the evidence. The 20× tier's price was also corrected $200 → $199.99.
- **The AI Clock's `frontier` counter is unverifiable and now says so.** No 2026 record training run is publicly confirmed; it's projected from Grok 4 (mid-2025) at 4.5×/yr. Epoch's central rate estimate is 5× (CI 4–6×), left unchanged as it's within the interval. Don't quote the frontier level as sourced.
- **`clock.json` levels have no plausibility guard** — see §0 open thread 9.
- **Fast mode is unmodelled on purpose** — Anthropic bills Opus 5 / 4.8 at $10/$50 under it, OpenAI renamed "priority" to Fast mode 2026-07-30. Opt-in API service tiers like batch or caching, not the default consumer rate.
- **DeepSeek's price rise LANDED** (found 2026-08-24): ~3× input, ~4.5× output, plus peak/off-peak metering by UTC clock time — the only provider here that bills by when you use it. Stored rates are the **peak** ones on purpose; see §0. Still the cheapest provider tracked, by a much narrower margin, with no indication that's the end of it. **The Auditor's downgrade advice leans on DeepSeek hardest, so this is the number to re-check first each time.**
- **Time-limited promotional rates are now machine-checked**, not prose. A promoted model carries `promo: { until, standard:{input,output} }` in `prices.json`, and `check-prices.js` fails once `until` passes, naming the rate to revert to. Live on `gemini-3.7-flash` and `gemini-3.6-flash` (half price to 2026-12-31). Add the block whenever a provider quotes a rate with an end date — that is the whole point of it.
- **Transparency Index:** env-only; pricing/data axes are ⚪. The two-scale design is intentional — don't "reconcile" xAI's 🟡-vs-🔴 by mistake (documented in `_meta.detail.note`). Colo landlords not scored yet; a couple of `power_mw` values are third-party estimates (don't change a badge).
- **Auditor caveats:** plan caps are approximate (rolling-window/compute-based limits); the per-model API cost skips models not in `prices.json.api` (undercount risk); API ≠ the product (no app/limits/features).
- **`update-prices.js` is not a real scraper** — hardcoded values, only Anthropic/OpenAI/Google; other providers change by hand.
- **The AI Clock is a modeled projection** — re-anchor quarterly.
- **`README.md`** is extension-focused and somewhat stale.
- **Google Fonts** load from `fonts.googleapis.com` on site pages (the privacy wart) — consider self-hosting.
- **Stale branches to delete:** `docs/project-context-2026-07` (superseded doc-rewrite attempt), `feat/opus-5-and-auditor-panel` (merged in PR #18), `feat/plan-value-columns` (merged in PR #20), `chore/price-refresh-2026-08-02` (merged in PR #21).
- **Prompt caching is unmodelled** in the cost estimate — we overestimate, increasingly with conversation length (§4). Disclosed rather than guessed; revisit only if a provider publishes hit rates.

---

## 11. How to ship

- **Website change:** open a PR into `main` (runs `validate-site.yml` once merged) → merge → GitHub Pages redeploys.
- **Extension change (automatic):** Actions → **Weekly Publish → Run workflow** (a manual run force-builds even without a price change) → uploads a draft + opens an issue → click **Publish** in the [dashboard](https://chrome.google.com/webstore/devconsole). Reactive versioning bumps `6.10` only if the store rejects it as a duplicate.
- **Extension change (manual):** bump the manifest version, zip the **contents** of `extension/` (manifest at zip root), upload in the CWS dashboard. ⚠️ If a prior version is "Pending review," the store blocks new uploads until it clears.
- `gh` **is** installed and authenticated — use it to open/merge PRs (`gh pr create` / `gh pr view`).

### ⚠️ Building the zip on Windows — two traps

Both were hit on the 6.12 upload; the second one is the dangerous one because the upload *succeeds*.

1. **`manifest.json` must be at the zip ROOT.** Zipping the `extension` folder gives `extension/manifest.json` and the store rejects it as missing. Zip the **contents**.
2. **Windows zip tools write backslash path separators**, which violate the ZIP spec. `manifest.json` is still found (it's at root), but Chrome then can't resolve `fonts/` and `icons/` — so it installs with **missing icons and fonts instead of failing**. This affects `Compress-Archive`, .NET `ZipFile::CreateFromDirectory` under PowerShell 5.1, *and* Explorer's "Send to → Compressed folder". `zip` is not available in this Git Bash.

Working build (writes each entry with an explicit forward-slash path; also drops the two store-docs markdown files, which shouldn't ship to users):

```powershell
$stage="$env:TEMP\ecometer-build"; $out="$PWD\ecometer-ai-v<VERSION>.zip"
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Copy-Item "$PWD\extension\*" -Destination $stage -Recurse -Force
Remove-Item "$stage\STORE-LISTING.md","$stage\STORE-SUBMISSION.md" -Force -ErrorAction SilentlyContinue
if (Test-Path $out) { Remove-Item $out -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[System.IO.Compression.ZipFile]::Open($out,'Create')
$base=(Resolve-Path $stage).Path.TrimEnd('\') + '\'
foreach ($f in Get-ChildItem $stage -Recurse -File) {
  $rel=$f.FullName.Substring($base.Length).Replace('\','/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$f.FullName,$rel,'Optimal') | Out-Null
}
$zip.Dispose()
```

Verify before uploading: no backslashes in entry names, `manifest.json` present at root, `fonts/` and `icons/` present. `*.zip` is gitignored, so the artifact won't be committed.

> Note: `release.yml` builds with `cd extension && zip -r ..` on Linux, which is correct, but it does **not** exclude `STORE-LISTING.md` / `STORE-SUBMISSION.md` — CI zips still contain them. Harmless, but the two paths differ.

### Store submission fields
Everything the dashboard asks for is pre-written — don't recompose it from scratch:
- `extension/STORE-LISTING.md` — short + detailed description, category, pre-upload checklist.
- `extension/STORE-SUBMISSION.md` — single purpose, per-permission justifications, remote-code answer, data-usage disclosure (**"Website content" only**, with reasoning), and a paste-ready explanation that the Auditor export is a local file save, not an upload.
- **Redeploy the hosted privacy policy in the same release as the zip** — the store checks the URL resolves and that the policy matches the permissions requested.
