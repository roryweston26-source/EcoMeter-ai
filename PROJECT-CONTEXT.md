# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-08-24._

> Read **CLAUDE.md** first (mission, principles, voice — auto-loaded). This is the deep dive.
> For anything that goes stale — prices, caps, student offers, clock anchors, selectors, store state — see **[`FRESHNESS.md`](FRESHNESS.md)**, which is the executable checklist version of the open threads below.

---

## 0. Working state (read this first) — as of 2026-08-29

### ✅ v6.14 IS UPLOADED (2026-08-28) — and 6.13 must have cleared review

**Rory uploaded `ecometer-ai-v6.14.zip` on 2026-08-28.** The store blocks a new upload while a prior version is still "Pending review" (§11), so **the fact that 6.14 went up is itself evidence 6.13 cleared** — its verdict was never recorded here before it was superseded. Worth confirming in the dashboard rather than assuming.

**What 6.14 carries over 6.13:** the water model was rebuilt twice on 2026-08-28 — from a flat ml-per-token constant, to a query-size curve, to energy × infrastructure (FRESHNESS F1a–F1c). **Users' water figures move**, and not uniformly: long sessions fall substantially, AWS-hosted models drop (published WUE is 0.12, not the 0.18 we had been using), Gemini is now anchored on Google's own measurement instead of a cross-vendor average that overstated it by 2.3×, and DeepSeek-on-DeepSeek rises sharply. If anyone asks why a number changed, `water.json` `_model_history` answers in order.

**v6.13 was the release that closed the long-running store gap**, which had been the top item since 2026-08-02. What it fixed, all live in the store since before then:
- **billed input charged at ~2×** (every "true cost" figure roughly double)
- **Claude image tokens at ~51×** (any conversation with an image wildly overcounted)
- **"±8% token estimate"** in the panel, when the real figure was 12.9% with a systematic undercount bias
- stale prices, no GPT-5.6 family, export v1

**The build that went up:** 6.14 was built by `node scripts/build-extension.js` — packaging is no longer a hand-run PowerShell snippet (§11, and FRESHNESS H0) — and verified with an *independent* implementation rather than the writer that produced it: 22 entries, zero backslash separators, `manifest.json` at root reading `6.14` *inside* the zip, `fonts/` (5) and `icons/` (4) present, store-docs excluded, and all 22 files extracting byte-identical to `extension/`. **All seven scripts passed at 6.14.** (6.13 was built from `main` at `35359ec` via the old PowerShell procedure.)

v6.13 had also carried the 2026-08-23 full price re-verification, the Auditor accuracy work and the corrected student-access data; 6.14 inherits all of it.

**Next checkpoint: the review verdict.** Two things to watch, in order of likelihood:
1. **Listing copy.** v6.12 was rejected on *Spam and Placement in the Store* (ref **Yellow Argon**) for the nine-platform keyword list — code was never at issue. If it lands again, the fixed copy is already in `STORE-LISTING.md` and the standing rule is at the top of that file.
2. **Permissions.** This build adds `generativelanguage.googleapis.com` for the opt-in Gemini token count, so expect permission re-review and a user-facing notice regardless of outcome.

**If it was left as a saved draft rather than actually submitted, submitting is the remaining step** — a draft sits in the dashboard indefinitely and never reaches review.

⚠️ **Prices in a shipped build are frozen.** The extension reads `chrome.runtime.getURL('prices.json')` — the bundled copy — and never fetches remotely. So 6.14's prices are what users see until the next upload. Concretely: **`gemini-3.6-flash` and `gemini-3.7-flash` are on a promotional half-price rate that ends 2026-12-31.** If 6.14 is still the live build in January it will *understate* Gemini cost by 2×, which is the harmful direction for this project. `check-prices.js` fails in the repo on that date, but a shipped build cannot know. Either exercise the weekly `publish.yml` cadence or diarise a December rebuild.

### Ship status

- **Website: current.** `main` auto-deploys; everything below is live on `legerlyai.com`.
- **Extension: v6.14 uploaded 2026-08-28, awaiting review.** Ships the rebuilt water model (F1a–F1c). v6.13 (2026-08-24) was the first build with the corrected cost model, and appears to have cleared review since the store would otherwise have blocked this upload.
- **What users get once it clears:** correct billed-input and image-token maths, the measured ±11% band instead of the false ±8%, prices verified 2026-08-24 against every provider's own page, the GPT-5.6 family, and export v2.
- **v6.12 was REJECTED 2026-07-29** — *Spam and Placement in the Store*, ref **Yellow Argon**: "excessive keywords in the item's description", quoting the nine-platform list. Listing copy only; code and permissions were never at issue. Fixed, with a standing rule at the top of `STORE-LISTING.md`. **6.13 was bumped pre-emptively rather than reactively** (the convention is to bump only on a duplicate-version rejection) because 6.12 was already consumed by the rejected submission. **6.14 was likewise bumped deliberately** — 6.13 is live, so shipping the water-model work needed a strictly higher version.
- Whatever is submitted still adds the **`generativelanguage.googleapis.com` host permission**, so expect permission re-review and a user-facing notice regardless.
- Paste-ready store answers already exist — don't recompose them: `STORE-SUBMISSION.md` (single purpose, per-permission justifications, data-usage disclosure — submitted as **"Website content" only**, reasoning in its §3) and `STORE-LISTING.md` (descriptions + pre-upload checklist).

### 2026-08-29 — the Transparency Index was graded wrong in ELEVEN cells, and ten of them were wrong against the provider

**This is the worst error the project has recorded, and the shape of it matters more than the count.** Re-read every axis against primary sources. Eleven cells changed. **In ten of them the provider had published the thing we said they had not**, and the Internet Archive confirms the text was live on the day we graded it. **None of this was a provider changing its behaviour. All of it was us.**

| Axis | Cell | Was | Now |
|---|---|---|---|
| data practices | xAI `training_default` | 🔴 | 🟡 |
| data practices | xAI `optout` | 🟡 | 🟢 |
| data practices | xAI `human_review` | 🔴 | 🟢 |
| data practices | OpenAI `retention` | ⚪ | 🟢 |
| data practices | Perplexity `optout` | ⚪ | 🟡 |
| data practices | Perplexity `retention` | ⚪ | 🟡 |
| environmental | xAI `replenishment` | 🔴 | 🟡 |
| environmental | xAI `energy_source` | 🔴 | 🟡 |
| pricing | Anthropic `context_window` | 🔴 | 🟢 |
| pricing | Google `context_window` | 🔴 | 🟢 |

Plus two environmental notes (xAI `site_level`, `comparability`) whose **grades were right and whose wording was false** — they claimed "no corporate environmental disclosure of any kind" about a company that runs a public Memphis disclosure site.

**THE ROOT CAUSE IS ONE THING: an asserted absence is only as good as the fetch behind it.** `x.ai/legal/faq` did not render for whatever fetched it in August, and the silence was written down as the provider's. The 2026-08-25 archived copy is **character-for-character identical to today's** — 115 lines both, differing only in a footer handle's capitalisation — and it contains a heading asking the exact question we said it never answered. Perplexity failed the *same way* and was correctly recorded as ⚪ ("not graded 🔴 on a page we could not read"); that discipline produced two right grades, and its absence at xAI produced three wrong ones. **⚪ is not politeness. It is the only thing separating "they are silent" from "we could not hear."**

**Tooling that actually worked**, after the in-app browser hit a Cloudflare interstitial and plain `fetch` got 403s: `curl -sL -A "<browser UA>"`. Check `<title>` before trusting a body — "Just a moment…" is Cloudflare, not the provider — and **retry once**, because one Perplexity article served a challenge then the real page. For "did they change it or did we get it wrong", use `https://web.archive.org/web/<ts>id_/<url>` (raw bytes, gzipped; archive.org 429s readily so pace it). That distinction demands opposite write-ups and is worth the extra request every time.

**Two things were built off the back of it:**

- **`scripts/check-transparency.js`** (§0 script list, FRESHNESS E1i) — gates the promises the index makes about itself: every grade sourced (122/122), no maintainer-speak in copy that renders, doc tables matching the JSON, coverage counts matching `datacenters.json`. Both destructive checks validated by replaying real bugs. **It cannot tell you a grade is wrong** — every error above would still pass it.
- **A fifth data-practices column, `advertising`** (FRESHNESS E1j). The finding is a substitution: only OpenAI and Google answer *are my conversations used to choose the ads I see?* The other six answer whether they **sell or share** your data with advertisers, which is a different and easier question.

**Two claims that survived the stress test, and they matter because a pass that only found errors would be its own kind of unreliable:** OpenAI's environmental cells were re-checked and held, wording and all — the careful phrasing from 2026-08-28 survived contact with the sources. And of the two, only one survived the rest of the day: **`allowance` is 🔴 for seven of eight, not all eight.** Google, Anthropic and xAI were read at source and publish nothing — but a later pass found **Perplexity does publish one**, "Consumer Max plans start with 10,000 credits a month", with a published conversion and typical task costs. **The claim that it held was itself written too fast, in this file, hours before it was disproved.** **Cells written carefully survive re-reads; cells written with a flourish — "has not even asserted a goal", "the clearest non-disclosure on this axis" — are the ones that broke.**

**The finding this leaves the index with is sharper than the one it replaced.** Three providers now publish an exact consumer context window and none publishes an allowance: they can quantify the size of one conversation and will not say how many you get. And xAI is 🔴 across all six environmental dimensions while scoring 🟢 on three of five data-practice ones — the strongest proof yet that the axes are independent and must never be averaged.

**Still open:** Google's per-plan context window (32k / 128k / 1M) is missing from `plan-limits.json` entirely — none of its five plans carries a `context_window` where OpenAI's four do — so `pricing.html`'s Ceiling column may understate what Google discloses. (The four `context_window` cells flagged as unverified mid-pass were subsequently re-read on consumer-facing pages and all four held at 🔴; two had been citing API documentation to prove a claim about consumer plans.)

### 2026-08-29 — three Chinese labs added to the price tracker, and open weights became a per-model fact

**Alibaba (Qwen), Z.ai (GLM) and Moonshot (Kimi) are now on `pricing.html`** — eight models, all read from the labs' own rate cards that day. `prices.json` goes from 8 providers to 10 and from ~68 to 76 models. **Per-token view only**: no subscriptions, no `plan-limits.json`, no extension picker, no Auditor. Full detail in FRESHNESS **A9** (the new blocks), **A10** (which "biggest" measure), **F1d** (the two water hosts).

**The design decision that mattered: the open-weights badge is per MODEL, not per provider.** Checking rather than assuming produced three results that a provider-level badge would have got wrong:
- **Alibaba does not open-weight the models it sells as flagships.** `qwen3.8-max` and `qwen3.8-flash` are closed; `qwen3.8-2.4t-a95b` and `qwen3.8-27b` are open. Alibaba's own pricing page draws the line itself under a heading reading *"Text generation - Qwen (open source)"*.
- **Mistral publishes only Small.** Medium 3.5, Large 3 and Codestral are all closed — the opposite of how Mistral is usually described, and it had been unlabelled here for months.
- **Only 6 of 11 badged models carry a standard OSI licence.** The flagships carry bespoke licences named after themselves (`kimi-k3`, `glm-5.3`, `qwen3.8-max`). Solid green badge for OSI, dashed grey otherwise, because those are not the same promise.

**The finding, and it is sharper than the one expected.** The pitch for tracking host spread was that identical weights would show order-of-magnitude price gaps. **They don't** — measured spreads are 1.18×–2.88×. What they *do* show is who is expensive: **for 4 of 6 models the lab that made the model is in the more expensive half of the market for it.** Z.ai is the dearest of 16 hosts for GLM-5.3. Moonshot is 12th of 15 for Kimi K2.7 Code. **Alibaba's published list price for `qwen3.8-27b` ($0.50) is above all eleven hosts serving it — including Alibaba's own resale at $0.425.** None of this is knowable for a closed model, because there is no second price.

**Two honesty constraints are load-bearing and must not be tidied away:**
- **The spread is not like-for-like.** Hosts serve at different numeric precisions (int4, fp4, fp8, bf16, mxfp4) and a 4-bit quantisation is a lossy compression of the weights. The cheapest host is often not running the same computation as the dearest, and most hosts don't state precision on their own pricing pages. The page says "precision varies (…)" wherever that is true.
- **`china_avg`'s note is a statement about us, not them.** We did not find a PUE or WUE disclosure for Z.ai or Moonshot; that is not the same claim as "they publish nothing". **Alibaba, checked properly, turned out to publish PUE 1.200** — filing it under the inferred 1.27 would have overstated its water against a figure the company publishes, which is the 2026-08-29 transparency failure in miniature. It cost two requests to avoid.

**`check-prices.js` gained §8** — shape, `low ≤ high`, `n ≥ 2`, `hosted` without `open_weights`, `osi` disagreeing with the licence string in either direction, missing url/source, and **`checked` older than 120 days fails loud**. All five destructive paths validated by breaking the data. Its first run failed on the `qwen3.8-27b` case above, because the guard had assumed a first-party rate must sit inside the host range; it now only catches order-of-magnitude gaps, which is the real failure mode.

**⚠️ Nearest expiry in the whole file: `glm-5.3-flash`'s half-price promo ends 2026-09-09.** At $0.075 it is currently the cheapest input rate on the tracker, so the ticker reads **$0.07**; from 2026-09-10 it should read $0.10. The guard fails on the date but the ticker is computed live, so there is a window where the headline is wrong.

**Second pass the same day — the biggest finding was hiding in a provider we already tracked, and one of my own entries was wrong.**

**DeepSeek's spread is 6.48×, the largest in the file, and it lands on a price rise this project had already flagged.** DeepSeek tripled its rates on 2026-08-24; the weights are MIT, so the market didn't follow. **16 of 17 hosts serve `deepseek-v4-flash` below DeepSeek's own API**, the cheapest at $0.068 against DeepSeek's $0.44. It **survives the off-peak objection** — at the half-price off-peak $0.22 it is still 16 of 17. `deepseek-v4-pro` does not: 7 of 17 at peak, only 2 off-peak. Quote the flash number, qualify the pro one. The quantisation caveat is also weaker here and provably so: DeepSeek's released checkpoint is `quant_method: fp8` with `expert_dtype: fp4`, so fp8/fp4 hosts serve **the format DeepSeek published**, not a re-compression. **Check `config.json` before repeating the generic precision caveat.**

**⚠️ The `alibaba` water host was wrong for about an hour and I corrected it.** First version: PUE 1.200 (FY2024) and "no Alibaba WUE figure found". **All three parts wrong** — current PUE is **1.187**, Alibaba **does** publish a WUE (**1.198 L/kWh**, as a three-year series), and clean electricity is 73.6% not 56%. Cause: stopping at a search snippet about a two-year-old report instead of opening the ESG resource page, where the current PDF is two clicks away. **An asserted absence resting on an inadequate search — the E1g failure, committed in the same change that cites it.** `wue_site` barely moved (1.2 → 1.198); **the provenance claim was the defect, not the number**, which in this project is the worse of the two. `pdftotext` on the actual PDF settled all three figures in one command. **And it produces a finding: Alibaba publishes a fleet-wide WUE series and Google does not.**

`deepseek-v3`'s licence is resolved — the repo carries `LICENSE-CODE` (MIT) and `LICENSE-MODEL` (**DeepSeek License Agreement v1.0**, bespoke). "DeepSeek is MIT" holds for V4 Flash/Pro and R1 and **fails for V3**.

### 2026-08-30 — two stale superlatives in shipped copy, both running against a provider

**A number in a data file gets checked. A superlative in a sentence does not.** Sweeping the site's own claims against its own data — prompted by wondering whether adding Z.ai had invalidated anything — turned up two, and neither was caused by a provider changing anything. Both were ours. Detail in **FRESHNESS E3a**.

- **`audit.html` told every DeepSeek user "It's still the cheapest provider we track."** It has been **third** since 2026-08-24, behind Mistral ($0.262 blended) and OpenAI's Luna ($0.450), at $0.660. The rise didn't narrow DeepSeek's lead, it ended it — and the 2026-08-24 pass recorded the new rates without re-running the ranking those rates invalidated. Six days in shipped advice, on the provider the code comments call the one "this engine's cheapest advice leans on hardest". Corrected copy places it third and credits off-peak for second ($0.33), which is true.
- **`pricing.html`'s allowance callout contradicted itself inside one paragraph** — computing "2 have a usage cap the provider publishes" and then asserting ChatGPT Go's was "the only absolute figure published anywhere". Perplexity Max (10,000 credits/month) was added 2026-08-29 and the prose never followed. **The callout now enumerates the disclosed plans from `plan-limits.json`, so it cannot drift again.**

**Both errors ran against a provider** — understating DeepSeek's cost relative to rivals, understating what Perplexity discloses. That is the direction E1g identifies as worst, and it is the second and third time this week.

**The rule: when a number moves, re-run every ranking the old number justified.** Recording the new value is half the job. Neither error would have been caught by re-reading a provider's page.

Three guards, each validated by reintroducing the bug: `check-prices.js` §9 (price ranking), §10 (callout derives from data), and `test-auditor.js` (the caveat reaches `r.why` and says something true — 65 → 69 checks; hand-driving the wizard never reached that branch).

### 2026-08-30 — the Chinese labs' consumer plans: Z.ai SHIPPED, Kimi and Qwen could not be

**Z.ai's plans are now live on the site**; the other two are not, and why not is a finding in each case. Full detail in **FRESHNESS A11**. The original argument for deferring subscriptions included "cap data for these labs will mostly be undisclosed" — **that was backwards for Z.ai**, which turned out to publish more than any provider already tracked.

**Shipped:** `Z.ai (Free)` plus GLM Coding **Lite $18 / Pro $80 / Max $168**, with real credit caps on both windows in `plan-limits.json`.

**Not shipped — Kimi.** Every CTA on its pricing page is **"Join Waitlist"**. The banner says the current plan is still buyable but never states its price, so the $19/$39/$99/$199 tiers are **announced, not purchasable, and the live price is unknown to us.** Publishing them would be publishing prices nobody can pay.

**Not shipped — Qwen.** Still login-walled, still ⚪, still no primary source.

**This moved a headline statistic, in the right direction: 27 plans / 2 disclosed → 31 / 5.** The callout now states it as a split — 2 figures cover a single feature, 3 bound the whole product, all 3 from Z.ai, which alone publishes the formula to check them. **Both halves are derived from `plan-limits.json`, attribution included** — the first draft hardcoded "every one of them from Z.ai", which is the E3a bug one layer down, and `check-prices.js` §10 now fails on that string.

**⚠️ Two live caveats.** The **Ceiling column deliberately refuses these rows**: the caps are in *credits* and `ceiling()` multiplies by cost *per message*, so `capPerDay()` now skips any non-`messages` unit. Converting credits→messages is possible from Z.ai's published formula and would make it **the first genuinely computed Ceiling on the site** — quote the all-peak end, since Z.ai's own range is ~2× wide. And **break-even for these rows has no reasoning multiplier**: `reasoningMult()` returns 1 for GLM, which understates output and so overstates break-even. Conservative, but wrong — and the same gap would undercount Kimi K3, which "always reasons" at `max`.

- **Z.ai's GLM Coding Plan is the strongest allowance disclosure found anywhere so far** — stronger than Perplexity, which E1k records as the sole exception among the eight. Lite **$18**/mo, Pro **$80**, Max **$168**, and it publishes the *absolute* credit allowance on two windows, the **credit formula**, the **per-model multipliers**, and a **token conversion table** (Lite on GLM-5.3 ≈ 48–97M tokens/week at 95% cache hit). The allowance is independently computable, not merely illustrated. **If added, quote the MIN of the range** — its top end assumes 100% off-peak, the same discount-you-don't-control problem `_deepseek_peak_offpeak` already settled for DeepSeek.
- **Kimi is the exact opposite and the contrast is the finding.** Tiers at $19/$39/$99/$199 sold as "more / 2x / 5x / 10x agent credits" with the base **never stated**. Its own comparison table quantifies six other limits precisely — including **project storage to the megabyte**. It is not a company that can't quantify; withholding the credit base is a choice about which number is commercially sensitive. ⚠️ All Kimi tiers are currently **"Join Waitlist"**, announced not purchasable, so they must not be recorded as live consumer prices.
- **Qwen Chat is ⚪ NOT ESTABLISHED**, not 🔴. `chat.qwen.ai/pricing` redirects to a login wall and every source that surfaced was an SEO price-aggregator — the exact class of secondary source that produced the F1d error. We could not read it; that is not Alibaba publishing nothing.

**The three span the full disclosure range — 🟢 / 🔴 / ⚪ — which kills any framing where disclosure quality tracks geography.** Same lesson as xAI scoring 🔴 across environmental while taking 🟢 on three of five data-practice cells: the axes are independent, and so are the countries.

**Open, and deliberately not done:** **Kimi is the weakest of the three picks on evidence** — it appears in no OpenRouter top-10 while Xiaomi's MiMo (#3) and Tencent's Hy3 (#5) both move more tokens. But the follow-up showed HF downloads and API tokens are **near-opposite measures** — Xiaomi has the smallest HF footprint of any lab considered and the third-largest token volume; Qwen is the exact inverse. "Biggest" can't be claimed without naming the measure (A10). `deepseek-r1` has one priced host so it correctly fails the `n >= 2` guard and carries no spread.

### 2026-08-31 — the window survey: three providers publish figures we graded them 🔴 for, and disclosed plans went 5 to 10

**Asked all nine providers one question nobody had asked: do you name a usage WINDOW,
and do you size it?** That is not the allowance question — Anthropic proves it, being
🔴 on allowance while still stating a weekly window. Before this pass four of nine had
window data and three of those four had arrived incidentally. Full detail in FRESHNESS
**B8**.

**Five of nine name a weekly or monthly window. Only Z.ai sizes the long one.**

**Three corrections, all against the provider — the same direction as 2026-08-29, which
makes it a pattern rather than an incident.** When this project is wrong about
disclosure, it is wrong by understating what the provider published.

- **OpenAI** publishes a per-model, per-plan table of local messages per five-hour
  window for Codex, a credits-per-1M-tokens rate card, and **names a weekly window
  twice** — hedged on the pricing page, unhedged in the help centre. All of it bounds
  **Codex, not chat**. ⚠️ It is also **the only place OpenAI has ever quantified the base
  its "5x/20x more usage" marketing multiplies**: the Pro columns are exactly 5x and 20x
  the Plus column.
- **Microsoft** quantifies Agents, Vision and Voice to the task and the minute — then
  makes Chat "Extensive use" and Premium's credits "Extensive usage beyond standard
  credit limits". **Quantified everywhere except the thing you upgrade for.**
- **Mistral** publishes one absolute figure, "150 / day on Pro", **in an FAQ answer to a
  different question**, while the comparison table it built for comparing plans is
  relative throughout.

**Two did not move, and the difference between them is the whole discipline.** xAI is
🔴 **read at source** on three pages — the only provider of nine naming neither a number
nor a window. DeepSeek went 🔴 → **⚪**, which is a correction to US: that cell had been
graded off the shared aggregate sentence, never off a DeepSeek page, and the site is a
JS shell we could not read. The readable API doc covers per-account CONCURRENCY, which
is not a consumer window and must not be quoted as one.

**This forced a shipped superlative to be rewritten, again.** The pricing callout said
"ChatGPT Plus at $20 now publishes no usage figure at all" — true on 2026-08-08, false
once the Codex table was found. The deletion of the general cap is still the finding;
the absolute claim around it was not. **E3a, third occurrence.**

**The finding got sharper, not weaker.** Four of eight index providers now publish
something and **all four bound a single feature** — Codex, Copilot's Agents/Vision/Voice,
Flash answers, Computer. Not that providers cannot quantify: **the quantified surface is
never the one you are buying.**

⚠️ **A scoped window must not reach the Auditor.** OpenAI's weekly window bounds Codex;
the Auditor prices chat. Repeating it at a Plus subscriber asserts about a surface the
tool does not measure — the same category error as pricing a plan off a feature
sub-limit. `unquantified_windows[].scope` suppresses it in the live resolver and in the
guard; `pricing.html` shows it with the scope named.

**Both new guards fired on this change before I touched the prose** — check-transparency
§4b on the moved counts, check-auditor §18 on the missing Auditor markers. That is the
first time a guard written in this repo has caught a real drift rather than a replayed
one.

### 2026-08-30 — weekly limits: the Ceiling column printed its first number in three weeks, and it is 6.72x lower than the old model would have said

**The models were single-window, and weekly caps are where that breaks.** `capPerDay()`
read one `binding` window per plan; `audit.html` compared a **busy-day** volume against
a scalar messages/day. Neither could express a plan with two windows, which is every
plan that has a weekly cap. Full detail in FRESHNESS **B1** (the window trap), **B4**
(the ceiling) and **B6** (unquantified windows).

**`binding` was the bug, and it is the interesting one.** Which window bites is a
property of the **user**, not the plan — the short window stops a burst, the weekly one
stops sustained use — so naming one in the data hardcoded an answer that varies per
reader, and for a ceiling it hardcoded the wrong one. The field is gone;
`check-prices.js` §11 fails if it comes back.

**The Ceiling column had computed for ZERO of 31 plans since 2026-08-08.** It now
computes for three — Z.ai's GLM Coding tiers at **$84 / $506 / $1,181 a month against
$18 / $80 / $168** — by converting credits to messages through Z.ai's own published
formula, divisor and per-model multipliers. Nothing in that conversion is estimated.

**And the weekly window is what makes it honest. Reading only the 5-hour figure would
have printed $567/mo for an $18 plan and called it 31x the price.** The weekly
allowance permits exactly **6.72x fewer** messages per day than the 5-hour window would
if it could be hit around the clock — a constant across all three tiers, because Z.ai's
5-hour cap is exactly 20% of its weekly one. **Five maxed consecutive 5-hour windows,
25 hours of use, exhausts the week.** That is the fact a per-day average erases.

**Two assumptions are ours and both make the ceiling SMALLER** — `cache_hit: 0` and
peak-rate credits, where Z.ai's own table assumes a 95% cache hit and its range's top
end assumes all-off-peak at half price. Both stored in the data rather than implied, so
flipping either is a visible edit that `check-prices.js` §11 fails on.

**The strongest evidence it is a real number: it barely moves with the archetype**
($82–$85 for Lite across light/standard/heavy), because credits and dollars are
near-proportional at Z.ai's own rates. A future re-verify that sees it swing by
archetype should suspect the conversion, not the plan.

**The other half is a non-disclosure, and it had been sitting in the file as prose.**
Anthropic, Google and Perplexity each state a weekly cap exists and none publishes a
figure. `plan-limits.json` has said since 2026-07-28 that Anthropic's weekly cap means
"the limit cannot be hit every day for 30 days" — while `audit.html` shipped
`cap: 144`, which is precisely 45/5h held every waking hour for thirty days. **The
prose knew and the number didn't**, which is the same shape as E3a: a claim in a
sentence gets checked by nobody.

**We did not guess the missing number, and that was the load-bearing call.** The
Auditor's fit test reads `cap` to decide whether a tier is big enough, so a
guessed-lower figure would push readers onto a **pricier tier on a number nobody
published** — the exact harm this tool exists to prevent. The number stays; the claim
attached to it changes, and only for the readers it can reach (≥24 days/month, since a
weekly cap cannot bite a four-days-a-month user).

**Three refusals held under pressure and are worth keeping:** the ceiling still refuses
feature-scoped caps (ChatGPT Go, Perplexity Max), Perplexity Pro correctly gets **no**
burst-rate label because its third-party figure is already weekly, and the Z.ai rows
make **no claim about human throughput** — an agent sends those messages, and "more
than anyone is awake for" would have implied a cap that never binds.

**Adjacent drift found and fixed:** `pricing.html`'s two fallback snapshots had rotted
to 26 and 27 rows against a live 31, with no Z.ai in either — while the allowance
callout derives "31 plans / 5 disclosed" from whatever is loaded. A failed fetch
printed a different finding from the one the data supports. Both are now **generated**
from `prices.json` and `plan-limits.json` rather than hand-copied.

**Guards, all eight destructive paths validated by reintroducing the bug:**
`check-prices.js` §11, `check-auditor.js` §18, `test-auditor.js` §6 (69 → 75 checks).
One of them was worth nothing when first written — the data check read pricing.html's
inline mirror of `plan-limits.json`, so emptying the real file left it green while the
two checks beside it went red.

### 2026-08-28 — the two cost paths disagreed, and only one of them drove the advice

Asked whether the measured multipliers changed the Auditor’s decisions. Swept 5,625 answer combinations with measured multipliers against the old guesses: **zero recommendations differed.** Only the printed break-even moved.

That turned out to be the finding, not the reassurance. `breakEven()` applied the reasoning multiplier; `apiCostPerMonth()` — the function the downgrade path actually decides on — did not. One recommendation, two different answers to "what would this cost on the API", differing by ~30% for a user on a reasoning model.

The gap ran the harmful way: the API looked cheaper than it is, so the Auditor was readier to say *drop your plan and pay per token* than the real bill supports. Someone following that advice gets a surprise invoice, from the tool whose entire job is preventing exactly that.

**Fixed, and the size of it measured rather than asserted: 40 of 5,625 combinations change (0.7%), all of them the same case** — *"Drop to free ChatGPT + pay-as-you-go"* becoming *"ChatGPT Plus — $20/mo"*. Light-to-moderate users on a reasoning model, where thinking tokens tip pay-as-you-go above the $20. Note the direction: this correction pushes people **toward** paying, unlike everything else this week. The Auditor now says so out loud in the copy, because a number that moves that way should explain itself.

**The guard that should have existed:** `test-auditor.js` now asserts the two paths agree per message across four models. Verified by reverting the fix and watching it fail (0.0325 vs 0.0425 on Opus). Writing it also caught a vacuous version of itself — a synthetic profile using `in`/`out` where `tokenBuckets` expects `inTok`/`outTok`, which produced zero-cost profiles and would have passed no matter what.

### 2026-08-28 — OpenAI measured too: four guesses checked, four too high

Rory funded the OpenAI API and the second half ran. The pattern from the Anthropic pass held, harder:

| Model | Guessed | Measured (n) |
|---|---|---|
| GPT-5.6 Sol | ×3.0 | **×1.2** (24) |
| GPT-5.6 Terra | ×2.5 | **×1.1** (24) |

**ChatGPT Plus break-even moves 16 → 26 messages/day** — the largest single correction of the week, on the plan most readers actually hold. Pro 79 → 131, Perplexity Pro 32 → 50.

Three things worth carrying forward:

1. **Reasoning models mostly do not reason on ordinary questions.** Sonnet 5 thinks on none of the 24; Sol and Terra think on none of the writing group. The whole category label is misleading for consumer chat.
2. **Task type predicts the multiplier better than the model does**, and consistently across vendors: writing ≈1.0, quick slightly above, research higher, coding highest (1.6–1.9). A future refinement is a per-group multiplier tied to the archetype selector rather than one number per model.
3. **Anthropic thinks about 50% more than OpenAI on identical prompts** (Opus 1.8 vs Sol 1.2).

**Four for four, every guess high.** Mine were 3.0/2.0/3.0/2.5 against measured 1.8/1.0/1.2/1.1 — an average overstatement of ~2x, all in the direction that flatters the subscription. The remaining estimates (Gemini, o-series, DeepSeek) should be assumed high until measured.

**Two more bugs in the harness, both found by using it:**

- Writing the report OVERWROTE it, so measuring one OpenAI model deleted the evidence behind yesterday’s measured:true Anthropic rows. Recovered from git; it merges per model now.
- The merge then stamped the old rows with today’s date, quietly claiming fresher provenance than the evidence supported. Each row now carries its own measured_on, and write-back uses it.

Also: PowerShell 5.1’s `Set-Content -Encoding utf8` writes a BOM, which `JSON.parse` rejects — so the command I documented for creating the key file produced a file the script then refused to read. It strips the BOM now.

### 2026-08-27 — the reasoning multipliers are measured now, and I was wrong by ~2x

Rory funded the Anthropic API and the harness ran. Both of my guesses were too high, in the direction that flatters the subscription:

| Model | Guessed | Measured (n) |
|---|---|---|
| Claude Opus 5 | ×3.0 | **×1.8** (23) |
| Claude Sonnet 5 | ×2.0 | **×1.0** (24) |

**Sonnet 5 does not think at all on ordinary questions** — `thinking_tokens: 0` on all 24, confirmed against a single probe showing no thinking block in the response. We had been charging readers for reasoning that never happens. Opus does think, and the split is legible: writing 1.3, quick 1.7, research 1.9, coding 1.9.

Break-even moved up accordingly: Claude Pro 13→17 msgs/day, Max 5× 63→86, Max 20× 127→172, Perplexity Pro's upper end 41→56.

**The measurement found two bugs in my own method, after the first run was already paid for:**

- I *derived* Anthropic's thinking tokens by subtracting a `count_tokens` of the visible reply, because I had asserted the API does not report them. It does — `usage.output_tokens_details.thinking_tokens`. Worse, the derivation produced plausible-looking numbers: `count_tokens` of an assistant message adds ~20 tokens of framing, so a no-thinking reply came out negative and clamped to exactly 1.0. Sonnet's 1.0 was right by accident before it was right on purpose.
- `max_tokens: 4096` truncated long replies. Thinking comes first, so truncation shrinks the visible half and inflates the ratio — the first run's research figure was measuring my cap.

Both fixed, re-measured (~$2.40 across the two runs), and `--from-report` now applies a stored report without re-billing anyone.

**The site now distinguishes measured from estimated per model** — the "show the math" panel says "Measured against the provider's own API over 23 ordinary chat prompts" on Claude rows and "a midpoint estimate, not yet measured" on ChatGPT ones, and the Auditor line does the same. Mixed provenance is fine as long as the reader can see which is which.

**Still guesses:** OpenAI, Google, o-series, DeepSeek. Both guesses that have been checked were high by 65–100%, so assume the rest are too. They need OpenAI and Google credit — the accounts had none, which is itself the Auditor's own thesis in miniature: a ChatGPT Plus or Claude Pro subscription buys nothing on the API.

### 2026-08-26 — the reasoning multipliers can be measured, and there is now a script for it

The multipliers shipped this morning were my judgement, and they are the largest soft input in a number that tells people whether to spend $20 a month. They do not have to be a guess: two of the three providers report thinking tokens outright.

| Provider | How |
|---|---|
| OpenAI | `usage.output_tokens_details.reasoning_tokens` — reported |
| Google | `total_thought_tokens` vs `total_output_tokens` — reported |
| Anthropic | Not reported. Thinking is billed inside `output_tokens` and the raw chain of thought is never returned, so the ratio is `output_tokens ÷ count_tokens(visible reply)` |

`scripts/measure-reasoning.js` runs an ordinary-chat corpus (24 prompts, four usage styles) against each model, reports p10/p50/p90 of the per-prompt ratio, and with `--write` puts them in `plan-limits.json` as `measured: true` with `n` and `as_of`. It costs about **$3** for a full pass, dry-runs by default, prices its own run from our `prices.json`, and skips any provider whose key is absent. Zero dependencies, like the rest of `scripts/`.

**Rory has to run it** — it needs his API keys, which are deliberately not in this repo and not in the agent environment.

Two design decisions worth keeping:

- **The corpus is deliberately boring.** Benchmark problems would measure the hard case, overstate API cost, understate break-even, and tell people a subscription pays for itself sooner than it does. That is the direction that costs the reader money, so the prompts are things like "how long should I boil eggs" and "why does my CSS grid collapse on mobile".
- **It measures the API, not the consumer app.** ChatGPT and Claude tune thinking behind the paywall and publish nothing. Break-even asks what the same usage costs on the API, so the API is the right scope — but it means the number is not "how much does Claude.ai think", and the script says so in its own header.

`check-auditor.js` now refuses a `measured: true` row without `n` and `as_of`: the flag is a claim about evidence, so it has to carry the evidence. One honest gap: the Anthropic path is the only one I could not exercise, because there is no key in this environment — if `count_tokens` rejects an assistant-only conversation it falls back to counting the same text as a user turn, which differs by a few tokens of framing.

### 2026-08-26 — break-even: the archetypes are generated now, and thinking tokens are priced

Asked to tighten the break-even numbers. Two of the three candidate levers were worth pulling; the third was not, and saying why matters as much as the change.

**Thinking tokens are now priced (the big one).** A reasoning model bills hidden chain-of-thought at the output rate, and the archetype’s `output` is the visible reply only. That understated API cost by 30–45% on exactly the frontier models people pay for, which pushed break-even *up* — a higher bar than the truth. `plan-limits.json._meta.reasoning` now carries lo/hi/mid per model and both engines apply `mid`. ChatGPT Plus 26→16 msgs/day at the frontier end, Claude Pro 21→13, Google AI Pro 48→28. EcoMeter has modelled this since it shipped; the website never did.

**Archetypes are generated.** `scripts/derive-archetypes.js` measures chars-per-token with the real cl100k tokenizer over this repo’s prose (3.882, 165 samples) and converts message lengths stated in *characters*. The assumption did not disappear — it moved to a unit a person can check against a real chat window. The numbers barely moved (standard 4,000/500 → 3,596/464), which is itself the finding: the old round numbers were reasonable, they just could not be checked.

**Caching stays unmodelled, deliberately** — modelling it means assuming the reader would cache competently on the API, and most would not. It is caveated, and it pulls the opposite way to the search fees in §A7.

**What NOT to import from EcoMeter:** its `PLATFORM_OVERHEAD_TOKENS` (1.5k–8k/turn of hidden system prompt). That is correct for measuring what a platform message costs to run, and wrong for break-even, which asks what *you* would pay on the API — where you write your own system prompt. Modelling it would have moved Claude Pro to ~9/day on a false premise. Recorded because it looks like an obvious next step and is not.

**Two bugs found on the way:**

- `update-prices.js` assigned `existing.api[p][m] = prices` wholesale, so any `long`, `promo` or (now) `reasoning` block was **destroyed the next time that model’s price changed** — including the `promo.standard` rate that exists precisely to survive until the revert date. Now merges.
- `pricing.html`’s "show the math" panel recomputed cost itself instead of calling the engine, and looked rates up under the plan’s own provider — so it silently showed **no working at all** on every Perplexity row, and would have disagreed with the headline number as soon as reasoning landed. It calls `costPerMessage()` now.

**Guards:** archetype drift across all three copies plus `CHARS_PER_TOKEN`; reasoning mirror drift, `mid` outside its lo/hi, multipliers for unpriced models, and site-vs-extension contradiction. Every one verified by injecting the fault. While testing one of them I found the site-vs-extension check had been silently scanning an empty string, because `PLATFORM_OVERHEAD_TOKENS` is referenced earlier in `sidepanel.js` than it is declared and the slice ran backwards — a guard that passes while checking nothing is worse than no guard.

### 2026-08-26 — what break-even does not carry: every provider but DeepSeek charges for search

Followed the Perplexity request-fee finding across the other providers. It is not a Perplexity quirk. Checked on each provider's own API pricing page: OpenAI web search $10/1k calls ($25/1k on the non-reasoning preview tool), Anthropic $10/1k searches, Google grounding 5,000 free/month then $14/1k, xAI $5/1k for web and X search, Perplexity $5/1k on the Sonar models. Mistral says tool APIs are per call but publishes no figure. **DeepSeek is the only one that charges nothing per request.**

Our cost per message is tokens only, so none of that is in any break-even on the site. Recorded as `FRESHNESS.md` §A7 with the figures and sources, and as a caveat in `plan-limits.json`.

**And a correction: I had the direction backwards yesterday.** The Perplexity note said omitting the request fee would "understate API cost and flatter the subscription". It does the opposite — understating API cost pushes break-even **up**, so we print a higher bar than the truth and the plan looks *harder* to justify than it is. Conservative for a "should I pay?" tool, still wrong. Fixed in all three places it was written. The Gemini entry below is unaffected: overstating API cost, which is what that bug did, genuinely does flatter the subscription.

**Not modelled, deliberately.** There is no honest figure for how often someone's messages trigger a search, and inventing one would replace a stated gap with an uncheckable number. If it is ever modelled it should be a visible input like the archetype selector. Prompt caching already biases the other way, so the two partly cancel by an unknown amount — which is itself worth saying out loud rather than treating the numbers as tight.

### 2026-08-26 — the other four providers, and break-even can now cross rate cards

Guard 9d only sees the five providers the Auditor audits. Checked the other four by hand against their own pages. Two were wrong:

- **xAI**: `x.ai/pricing` publishes a single model row — **Grok 4.6** — across the consumer plans. We paired it with `grok-4.3`, which is not on that page at all, so every SuperGrok tier was showing an invented range. Now one figure each: Lite 30/day, SuperGrok 91, Plus 303, Heavy 909.
- **Perplexity**: the help centre publishes a per-plan model table (updated 2026-07-29) and the plans are almost entirely **third-party frontier models** — Pro serves GPT-5.6 Terra, Gemini 3.1 Pro, Claude Sonnet 5 and Grok 4.5; Max adds GPT-5.6 Sol and Claude Opus 5. We were pricing both against Perplexity's own Sonar rates, which answers a question nobody asked. Pro was 56–148 msgs/day, now **48–51**; Max was 342–556, now **205–256**.
- **Mistral** ✅ and **DeepSeek** ✅ — Mistral's own pricing page names Medium 3.5 and Small 4 as its latest models, exactly our pair; DeepSeek has no paid tier so no break-even exists.

**New capability, and it is small:** `value_models` accepts a `provider:model` key (`anthropic:claude-opus-5`). Both `costPerMessage()` implementations resolve it, both label functions strip it, and `check-prices.js` and `check-auditor.js` understand it. It exists because a reseller's plan should be priced against what it actually serves.

**Sonar is deliberately excluded from the Perplexity figure**, and this is the interesting bit: the app model is branded *Sonar 2* with no API rate published under that name, and the Sonar API charges a **per-request search fee ($5/1,000) on top of tokens** that our cost model does not carry. Pricing it at token rates alone understates API cost, which pushes break-even up and makes the plan look harder to justify — the conservative direction, but still wrong. (I first wrote that the other way round; see the survey entry above.) Perplexity also states the Sonar chat API is supported only **until 2026-09-27** — now in the dated calendar.

**Guard 9e:** every `value_models` key in the file, audited or not, must resolve to a priced rate. That is the only automatic check the four unaudited providers get. Verified by injecting a bad model and a bad provider.

### 2026-08-26 — every Gemini break-even was priced on models those plans don't carry

Found while re-checking the break-even figures. `plan-limits.json` → `value_models` for all five Google rows still named `gemini-3.5-flash` and two Flash-Lites, months after `prices.json` and `PLANS[].models` moved to `gemini-3.6-flash`. Both files were internally consistent, re-verified on different days, and wrong together — only a join could see it.

| Plan | Was | Now |
|---|---|---|
| Google AI Plus | 16–95 msgs/day | 12–34 |
| Google AI Pro | 48–64 | 48–137 |
| Google AI Ultra | 238–317 | 238–684 |

The Pro and Ultra errors ran in the direction that flatters the subscription — we were telling a light Gemini user their $19.99 paid for itself at 64 messages a day when the honest figure on the plan's own models is 137. **Guard added** (`check-auditor.js` 9d): a `value_models` entry for an audited provider must appear in that tier's `models` list; verified by injecting the fault. Also caveated in `plan-limits.json`: these figures sit on a promotional Flash rate that ends 2026-12-31 and will move when it does.

OpenAI, Anthropic and Microsoft rows all passed the same join. The four providers the Auditor doesn't audit (xAI, Perplexity, Mistral, DeepSeek) have no tier model list to check against — still a manual read.

### 2026-08-26 — the student answer now reaches the recommendation

Ahead of marketing the Auditor to new students (the reason for the 2026-08-08 audit below), two gaps in that exact path:

- **Question 9 changed nothing about the recommendation.** `a.student` was read by one function, `studentPanel()`, which renders *below* the cards. So a student could be told "Google AI Pro — $19.99/mo" and then, separately and further down the page, that a free year of that same plan exists — with nothing joining the two. New `studentNote()` adds a line to the card itself, composed from `student-access.json`: only `disclosed` routes (an institutional programme is not an action this reader can take), students only (a student offer is not a teacher one), and no offer name or date typed in the page.
- **The rendered page never re-checked the deadline.** `check-auditor.js` fails on a passed `claim_by`, but only when a build runs; the site is static and can be read months later, still saying "claim by 31 Dec 2026" in the present tense with a *published by the provider* tag. `offerLive()` is now the one place that comparison happens — it governs the help text, the route row (which flips to *deadline has passed* and drops the call to action) and the card line (which disappears). Eight new checks in `test-auditor.js`.

This is the file's own caveat applied to our own rendering: don't ask whether an offer exists, ask whether the deadline has passed.
### 2026-08-25 — the Transparency Index was finished: all three axes scored

**The index is complete.** Environmental (7 providers × 6), pricing (8 × 5) and data practices (8 × 4), all scored, never averaged. **114 of 114 cells link to a source** (42 / 40 / 32), every URL checked. `datacenters.json` is fully re-verified — `last_updated` 2026-08-25, **zero stale sites**, the first time the file-level date has been earned since 2026-07-13.

**What moved, and why it mattered:**
- **Microsoft does publish per-site water and power** — in the companion *Data Fact Sheet*, Table 15, not the flagship report where the previous pass looked. `site_level` 🔴→🟢, `replenishment` 🔴→🟡. **The first grade movement this index has ever recorded.** The earlier blocker was tooling, not disclosure: `pdftotext -layout` reads the PDFs that WebFetch could not.
- **Google and Meta were a reporting cycle stale** and four notes were materially wrong — Google publishes 36 named locations (not 24) with withdrawal, discharge *and* consumption, and its emissions are 62% above the 2019 base, not ~51%. Meta reports per-facility *electricity and emissions*, which our note denied.
- **Amazon was wrong in both directions** — a public per-Region PUE/WUE table exists, but only as *ratios*; absolute volumes are a single global total or live inside a paying customer's console.
- **xAI / OpenAI / Anthropic re-verified, not assumed** — still 🔴 across all six, now resting on Aug 2026 reporting rather than Dec 2025 trackers.

**Two new axes.** Pricing: providers publish the price and when it changes (five converge on exactly 30 days' notice) and **26 of 31 consumer plans publish no usage allowance** (26 of 27 as first written; 25 of 27 from 2026-08-29 when Perplexity Max's allowance was found; 26 of 31 from 2026-08-30 when Z.ai's three GLM Coding tiers were added — note the ratio weakened from 96% to 84% while the absolute number returned to its original value, which is how the stale copy of this sentence in `transparency-index.json` survived a second reading). Data practices: at OpenAI, Anthropic and Mistral the paying *business* customer is opted **out** of model training by default while the *consumer* is opted **in** — documented by the providers themselves.

**Two grading calls deliberately left open** (in `datacenters.json` `_meta.verification_status`): The Dalles 🟡-vs-🟢 (moves no badge) and New Carlisle 🟡-vs-🔴 (**would move Amazon/Anthropic 🟡→🔴** on its 1,100 MW weight). Neither should be flipped as a side effect of another change.

**Also:** `.claude/launch.json` + `static-server.js` are now committed, so `preview_start {name: "site"}` works from a clone instead of every session hand-rolling a server. `settings.local.json` is gitignored.

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
- **Transparency Index re-checked; the open question it raised was answered later the same day — see open thread 14.** Microsoft's flagship report does not carry the per-campus table, but the companion **2026 Environmental Data Fact Sheet does** (Table 15, 29 named locations). `site_level` 🔴→🟢 and `replenishment` 🔴→🟡: **the first grade movement this index has recorded.** The unconfirmable-PDF problem was a tooling gap, not a disclosure gap — `pdftotext -layout` reads both documents fine.
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

### Eight scripts now guard this — run them, they have already caught real regressions

```bash
node scripts/check-prices.js      # 5 files must agree on every price; fails on an EXPIRED promo rate
node scripts/check-auditor.js     # audit.html + pricing.html fallback vs prices.json / plan-limits / student-access
node scripts/test-auditor.js      # sweeps all 56,250 answer combos + the EcoMeter import
node scripts/test-cost-model.js   # 44 assertions: billed input, image tokens, tiers, export v2
node scripts/calibrate-tokenizer.js  # measures the estimator; fails if the UI band is optimistic
node scripts/check-clock.js       # clock fallback parity + level plausibility vs published totals
node scripts/validate-site.js     # pre-deploy HTML/JSON gate
node scripts/check-transparency.js  # index self-promises: sourcing, public copy, doc-table drift
```
`validate-site.yml` now runs FIVE on every PR — `validate-site.js`, `check-auditor.js`, `test-auditor.js` (added 2026-08-08), `check-clock.js` (added 2026-08-24) and `check-transparency.js` (added 2026-08-29). `check-prices.js`, `test-cost-model.js` and `calibrate-tokenizer.js` are still manual; running them is part of a `FRESHNESS.md` pass.
`check-prices.js` caught a fallback that silently missed a patch during the 2026-08-02 refresh. `calibrate-tokenizer.js` is what proved the 8% claim wrong. `check-auditor.js` was written on 2026-08-08 because **`check-prices.js` never opens `audit.html`** — and the auditor turned out to be a sixth copy of the price table carrying a rate corrected ten days earlier. **`test-auditor.js` found a live bug on its first run:** the volume-aware downgrade kept its own copy of "does this tier clear your needs" that never received the image-generation gate, so **450 of 56,250 combinations told people who generate images regularly to drop to a free tier that throttles it**. The two definitions are now one function (`clearsNonModelNeeds`). **All six pass/fail guards pass on `main` as of 2026-08-25** (`check-prices`, `check-auditor`, `check-clock`, `test-auditor`, `test-cost-model`, `validate-site`) — re-run, not assumed. The seventh script in the heading above, `calibrate-tokenizer.js`, is a **measurement** tool rather than a gate, which is why the count reads seven there and six here.

**Two guards added 2026-08-24, both verified by injecting the fault.** `check-prices.js` now fails when a `promo.until` date passes and names the standard rate to revert to — Sonnet 5 nearly cost us a wrong price because its expiry lived in prose that nothing could check, and Google put two models on a dated promo three weeks later. `check-auditor.js` now validates `LEGACY_MODELS`, the set subtracted from the frontier signal, asserting every entry genuinely enters the advanced set; it immediately caught a no-op entry and forced the realisation that GPT-5.5 is free on Copilot *and* paywalled on OpenAI at the same time.

**Data checks and behaviour checks catch different things, and the Auditor needed both.** `check-auditor.js` would never have found the downgrade bug — every file was internally consistent. Sweeping the answer space did, in seconds. When a change touches what the engine *decides* rather than what the data *says*, `test-auditor.js` is the one that matters.

⚠️ **`check-prices.js` does NOT cover `audit.html`.** `check-auditor.js` covers `audit.html` plus `pricing.html`'s inline `FALLBACK_LIMITS` (the seventh copy of the plan data), but not its prices — that's `check-prices.js`. They are complementary, not overlapping. Run both.

The clock gap is now closed. **`check-clock.js` (added 2026-08-24) is the sanity check open thread 9 asked for** — it compares each scenario's implied calendar-year total against a figure recorded in `clock.json._meta.plausibility`, and it was validated by replaying the PR #22 levels: capex fails at 34.9% off, and the tokens level fails a separate share bound because it put Google at 80% of all tokens on Earth. It also diffs `ai-clock.html`'s fallback copy and refuses a hardcoded anchor date. It covers capex and energy only, because those are the two counters with a single authoritative worldwide total; adding invented targets for the rest would launder a guess into a passing test.

**`check-transparency.js` (added 2026-08-29) closes open thread 17 and the drift it sat next to.** The 2026-08-29 re-read found **eight wrong cells across two axes, and every one of them passed `validate-site.js`** — because that script checks form and these were failures of substance. This one gates the promises the index makes about itself:

1. **Every grade links to a source** (currently 114/114), and if `_meta.methodology` states an "N of N" count, that count must still be true. The page made this promise while 36 of 42 cells were plain text.
2. **No maintainer-speak in copy that renders** — cell notes and `water_note`s are public. This is open thread 17's ask, and it is **validated by replaying the real bug**: injecting the Microsoft PR's "Do not flip this grade on the strength of that row" into a `water_note` fails the script.
3. **The grade tables in this file must match the JSON.** Validated the same way — replaying the tree from before 2026-08-29 fails on four pricing rows plus the §10 "env-only" caveat, which is exactly the drift that had gone unnoticed since 2026-08-25.
4. **Hardcoded coverage counts** ("12 sites across 7 providers") are checked against `datacenters.json` in both docs and the JSON caveats.

Two deliberate softenings, both to stop the script becoming noise people ignore: a ⚪ whose note says it is deliberate (Microsoft's rate card) is not warned about, and a doc line that **quotes** old wording while correcting it ("this line used to say …") is not flagged as an assertion of it.

**What it deliberately does NOT check: whether a grade is right.** No script can read a provider's policy and tell you the cell is wrong — that is what a re-read is for, and it is why `_meta.last_verified` warns once it passes 120 days.

### Open threads, most useful first

1. **Watch for the v6.14 review verdict** (uploaded 2026-08-28; see §0). If it is rejected on listing copy again, the fixed text is already in STORE-LISTING.md — do not recompose it. If it is left as an unsubmitted draft, submit it. **Expect permission re-review** for `generativelanguage.googleapis.com` and a user-facing notice regardless of the verdict — that is the likeliest source of friction, and it is unrelated to the water work. Also confirm in the dashboard that **6.13 actually published**, which this upload succeeding implies but does not prove.
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
12. **The Auditor covers 5 of the 10 providers in `prices.json`** — DeepSeek added 2026-08-08; still no xAI, Perplexity or Mistral, and **none of the three Chinese labs added 2026-08-29** (Alibaba, Z.ai, Moonshot), which are priced and shown on `pricing.html` but carry no consumer plans here, so there is nothing for the Auditor to break even against yet. **Perplexity is the one students ask about**, and it's the awkward one: its Sonar rates exclude a $5–14 per 1,000 requests fee that for chat-shaped use exceeds the token cost, so any figure the Auditor derived would be a substantial undercount and would need surfacing in the result itself, not a footnote. **Mistral** is the only provider publishing a student price ($5.99/mo, already in `prices.json`) but may have rebranded Le Chat → "Vibe", and plan names are the join key across three files. Adding a provider is now guarded by `check-auditor.js`.
13. **Revisit the tokens rate at the October re-anchor.** `5×/yr` matches near-term observation (Google disclosed 7× YoY at I/O 2026) but longer-range forecasts imply ~2.2×/yr. Kept at 5 because the model is re-anchored quarterly and explicitly isn't for multi-year extrapolation — but if the next anchor still shows 5× diverging from reality, that's the counter to cut. Full list of live judgement calls is in `clock.json` `_meta.open_questions`.
14. **RESOLVED 2026-08-24 — Microsoft does publish location-level water and power, and this index has recorded its first grade movement.** The table is not in the flagship report but in the companion **2026 Environmental Data Fact Sheet, Table 15 — "FY25 Datacenter water and electricity use by location"**: electricity (MWh), water withdrawal (ML), non-potable share and replenishment volume for **29 named locations**. Read directly from Microsoft's own CDN with `pdftotext -layout`, which is the tool the last pass lacked. `site_level` moved 🔴→🟢; `replenishment` 🔴→🟡 (per-location volumes, with an asterisk marking priority locations that have delivered nothing yet). **Four limits are recorded in the cell rather than smoothed over:** the unit is a metro area/regional cluster, not a building; it is **withdrawal, not consumption** (consumption stays global/regional in Table 14); scope is Microsoft-*owned* sites under its own operational control, so leased colo is out; and **Table 15 sits in Section 2, which the fact sheet states was outside Deloitte's limited-assurance review** — the most granular figures Microsoft publishes are its least assured. **No grade in `datacenters.json` moved**, deliberately: FY25 ended 2025-06-30 (before Fairwater Atlanta was operational), Fairwater Atlanta is QTS-leased and thus out of scope, and there is no Mount Pleasant row at all. Both site notes now say so.
18. **RESOLVED 2026-08-25 — the pricing axis is finished; all eight providers read from primary sources.** `price_change` and `model_retirement` now come from each provider's own terms and docs, not one secondary source anywhere on the axis. **Every grade on both matrices links to a source: 42/42 environmental, 40/40 pricing.** One ⚪ remains by design — Microsoft's API rate card, not graded because Copilot has no per-token price to publish.

**Three results worth remembering, because they cut against the obvious story:**
- **Price-change notice is the industry's most standardised disclosure.** Six of eight commit to a quantified period; **five land on exactly 30 days** with a cancel-before-renewal right (OpenAI, Anthropic, Google, xAI, Mistral). Microsoft commits 15. Only Perplexity ("reasonable notice") and DeepSeek have no usable number.
- **Mistral has among the best disclosure on the table** — a published lifecycle policy with notice quantified per stage (GA **6 months**, preview/labs/third-party 1 month), equalling OpenAI and beating Anthropic's 60-day floor. The smallest provider, not the biggest.
- **xAI is 🔴 across all six environmental dimensions and 🟢 on consumer price-change notice.** Proof the axes are genuinely independent and must never be averaged.

16. **RESOLVED 2026-08-25 — `source_url` is now 42/42 on the environmental matrix and the methodology claim is true.** Every cell in the disclosure matrix links to a source, and all 12 distinct URLs were HTTP-checked. Two useful sources 403 a bare `curl` but load fine in a browser (Fortune, CNBC) — bot-blocking, not dead links; where that happened the cell links to a reachable equivalent (the syndicated Insurance Journal copy, SELC's own page). **Keep this at 42/42** — if a future pass adds a provider or a dimension, add the link in the same commit, because the methodology now promises it.

15. **RESOLVED 2026-08-25 — all 12 sites re-verified; `last_updated` is 2026-08-25 and the backlog is cleared.** Every `as_of` reads `2026-08`. **No provider badge moved.** Substantive changes: `xai-colossus-2` (the stalest entry, last checked 2025-07) came online ~Jan 2026 at several hundred MW — capacity left **null** because third-party estimates disagree (~450–500 MW vs an earlier 140 MW phase), per the show-a-range rule; `google-council-bluffs` and `google-the-dalles` now carry Google's own 2025 withdrawal/discharge/consumption figures; `coreweave-polaris-forge` is ~400 MW leased across three agreements but still publishes only *design* claims ("WUE near zero"), so it stays opaque. **Two grading calls are flagged, not resolved** — see FRESHNESS §E2: The Dalles (partial vs transparent, moves no badge) and New Carlisle (partial vs opaque, **would move Amazon/Anthropic 🟡→🔴** on its 1,100 MW weight).

17. **RESOLVED 2026-08-29 — `scripts/check-transparency.js` now fails on maintainer-speak in public copy.** Site `water_note`s and matrix cell notes render on the page; a note shipped in the Microsoft PR containing "Do not flip this grade on the strength of that row" went live. The check scans every rendered note for maintainer instructions ("do not …", "this file", "future pass", TODO/FIXME, pointers to PROJECT-CONTEXT or FRESHNESS) and was **validated by replaying that exact string** — injecting it into a `water_note` fails the script. In CI on every PR.

19. **RESOLVED 2026-08-29 — the fifth data-practices column is BUILT.** `advertising` is live across all eight providers (🟢 OpenAI, Google, DeepSeek, Mistral · 🟡 Microsoft, Perplexity, xAI, Anthropic). The finding is a substitution: only OpenAI and Google answer *are my conversations used to choose the ads I see?* — the other six answer whether they **sell or share** your data with advertisers, which is a different and easier question. Full per-provider evidence in FRESHNESS §E1j, including what rots (Google’s 🟢 rests on a forward promise; OpenAI’s ads test was still expanding).

20. **`transparency-index.json` row keys vs. company names — xAI is now "SpaceXAI LLC".** Its privacy policy (effective 2026-08-24) is issued by SpaceXAI LLC, "a separate company from X Corp." **The row key stays `xAI`** on the Mistral/Vibe precedent: `data_practices.rows[].provider` joins to `audit.html`'s `PRACTICE_ROW` by display name and `check-auditor.js` asserts both directions, so renaming means changing both in one commit. The rename is recorded in the cell notes instead. Decide it deliberately if it ever moves.

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
  manifest.json             MV3, version 6.14  (host perms incl. generativelanguage.googleapis.com)
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

.claude/                  Dev tooling — committed, not part of the site
  launch.json               preview_start {name: "site"} → static server on :8899
  static-server.js          Zero-dep static server for local preview (never shipped)
  settings.local.json       Per-machine permission allowlist — gitignored

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
  "api":   { "<provider>": { "<model-key>": { "input": <$/token>, "output": <$/token>, "long"?, "promo"?, "open_weights"?, "hosted"? } } },
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
- **Open weights and the host spread (added 2026-08-29).** Two optional blocks on an `api` entry: `open_weights { license, osi, params, url }` and `hosted { n, low, high, cheaper_than_first_party, quant, checked, source }`. Full detail in **FRESHNESS A9**; the three things not to lose:
  - **Open weights is a property of a MODEL, not a provider.** Alibaba publishes weights for two of its four models here and not the other two; **Mistral publishes only Small** — Medium 3.5, Large 3 and Codestral are closed, which is the opposite of how Mistral is usually described. The badge is driven purely by the presence of an `open_weights` block, written only when the weights page has been loaded.
  - **`osi` is a separate, weaker claim.** Only 6 of 11 badged models carry a standard OSI licence; the flagships carry bespoke ones named after themselves. Solid green badge for OSI, dashed grey otherwise.
  - **The spread is not like-for-like.** Hosts serve at different numeric precisions (int4→bf16), so the cheapest host often isn't running the same computation as the dearest. The page says so wherever `quant` varies.
- **The finding the spread produced:** for **4 of 6** measured models the lab that made the model sits in the more expensive half of the market for its own model. Z.ai is the dearest of 16 hosts for GLM-5.3; **Alibaba's list price for `qwen3.8-27b` is above all eleven hosts, including Alibaba's own resale.** This comparison is only possible because the weights are public — a closed model has no second price.

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
`_meta` holds **page-level** copy (title, lede, `last_verified`, the 4-state `grade_legend`, `axes`, `methodology`, `caveats`) **plus** a nested `detail` block (its own 3-state legend/note) for the environmental matrix.

**Three matrices now live in this file, and they are separate on purpose:**
- `columns` / `rows` — the 7-provider × 6-dimension **environmental disclosure matrix** (nested under the scored environmental axis).
- `pricing` — top-level key: 8 providers × 5 dimensions. Own `title`, `note`, `grade_legend`, `caveats`, `columns`, `rows`.
- `data_practices` — top-level key, same shape: 8 providers × 4 dimensions.

**Different provider sets, deliberately.** The environmental matrix covers who runs the datacenters (Amazon, Meta included); the other two cover who sells AI to consumers and developers (Perplexity, Mistral, DeepSeek, Microsoft included). Not a bug — each axis note says so.

`renderMatrix(data, headId, bodyId)` renders any of them; `renderAxisMatrix(block, prefix)` drives the two top-level ones. **A fourth axis is one `<section>`, one call and a data block** — and a block whose key is absent leaves its section hidden rather than rendering empty. See §7.

### `datacenters.json` — per-site AI-datacenter environmental data
`{ _meta:{last_updated, methodology_note}, sites:[…] }`. Each site: `provider`, `name`, `location`, `power_mw` (+optional `power_mw_planned`), `water_grade` (transparent|partial|opaque), `water_note`, `sources[]`, `as_of`. `transparency-index.html` computes provider grades from this. See §7.

### `extension/water.json` — per-**token** model water-intensity tiers (extension only). Distinct from `datacenters.json` (per-**facility**).

---

## 6. The Subscription Auditor + EcoMeter loop (marquee feature)

**`audit.html`** — a client-side quiz recommending the plan/tier/free option that fits real usage.

- **11 questions:** 7 usage → a **5-level classification** (Dabbler → … → Power user); then current-spend, student/teacher status (§5a), team, priority. Only the 7 usage answers score — `classify()` reads `SCORE`'s keys, so adding a non-scoring question is safe.
- **Every question has to change something (audited 2026-08-25).** Three did not, and each failure was invisible because `classify()` scoring one is not the same as `recommend()` reading one:
  - **`priority` ("what matters most") was collected and read by nothing** — the last question before the result changed nothing about the result. It now breaks a genuine tie: where "cheaper tier + API" lands within the margin of our own conversation-size assumption of the all-inclusive tier, `cost` keeps the cheaper and `capability` keeps the tier, and the copy says that is what happened. `privacy` renders the provider's `training_default`/`optout` grades from `transparency-index.json`; `feature` names what the tier adds over free, which is what finally made `PLANS[].features` more than inert metadata. It fires on ~0.9% of profiles by design — a tie-break that fired often would be inventing precision. **`test-auditor.js` now sweeps `priority` and asserts the tie-break fires somewhere**, which is the check that would have caught the dead question.
  - **`frequency` only moved the cosmetic level badge.** It now sets `ACTIVE_DAYS` (days/month), so the monthly API bill and the break-even comparison use an average day while **cap checks keep using the busy day** — a cap bites on your worst day. Multiplying a busy day by a flat 30 had been overstating the API side several-fold for anyone non-daily, which made every subscription look better than it was. Unknown answer falls back to 30, never lower (FRESHNESS B5).
  - **`media` asked a compound question** — "images or video, or voice / advanced features" — but only `image-gen`/`video-gen` gate anything, so a heavy *voice* user's "regularly" was spent pushing them up a tier for image generation. Narrowed to what the engine actually reads.
- **The "what do you pay for today?" list is derived from `PLANS`, not hand-written.** Four of the ten paid tiers were missing from it, and `check-auditor.js` only checked that listed options resolved to a tier — never the inverse. **Claude Max 20× was the expensive one:** a $200/mo payer had to pick "Claude Max", which resolved to Max 5× at $100, so the saving quoted was $100/mo too small — this tool's headline number, wrong, on the biggest overpayment it exists to catch. Both directions are guarded now, and `PLAN_ALIAS` carries renames ("Microsoft 365 Premium (was Copilot Pro)") so a retired plan name still has a row to pick.
- **Dated copy is composed from data, never typed.** The student question's help used to read "as of August 2026 three of them are … claimed by 31 Dec 2026": a month that expired by itself, a count hand-copied from `student-access.json`, and a deadline that would have gone on advertising a dead offer. Routes now carry `claim_by` + `claim_label`, the count is counted, an expired deadline is dropped from the copy, and `check-auditor.js` **fails once the date passes** (the `promo.until` idiom).
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
5. **Pre-filled answers are labelled, and the reader's correction wins.** The quiz used to show a pre-filled answer, let you change it, and then use the export's value anyway — asking a question and discarding the answer, just harder to notice. `_ecoFill` marks what came from the export (rendered as a hint on that question) and `_ecoOverride` records a genuine change, after which `profileFor()` stops preferring the export for that field. Re-clicking the same option is **not** a change: that would swap a measured figure for a band midpoint. A corrected message count keeps the **measured per-message size** and rescales, so the correction never throws away the measurement it doesn't contradict.
6. **The import resumes at the frequency question on purpose** — the export averages per *active* day but cannot know how many active days a month there are, so that answer stays the reader's (FRESHNESS B5).

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
| **Environmental impact** | **Scored** — per-site, capacity-weighted |
| **Pricing** | **Scored 2026-08-25** — 5 dimensions × 8 providers, never averaged |
| **Data practices** | **Scored 2026-08-25** — 4 dimensions × 8 providers, never averaged |

**All three axes are now scored.** They stay separate and are never combined: xAI is 🔴 across all six environmental dimensions, 🟢 on consumer price-change notice, and 🔴 on stating its training default. Averaging those into one "transparency score" would destroy the only information the index has.

### The pricing axis (added 2026-08-25)

Lives in `transparency-index.json` under a **top-level `pricing` key** (`title`, `note`, `grade_legend`, `caveats`, `columns`, `rows`) — deliberately NOT under `_meta.detail`, which is the environmental matrix. `renderMatrix()` was generalised to `renderMatrix(data, headId, bodyId)` and `renderPricing()` drives a second section that **stays hidden if the `pricing` key is absent**, so removing the data removes the section cleanly.

**Different provider set on purpose:** the 8 that sell AI directly to consumers or developers (OpenAI, Anthropic, Google, xAI, Perplexity, Microsoft, Mistral, DeepSeek). Amazon and Meta are in the environmental matrix and not here. That asymmetry is intentional and the axis note says so.

| Provider | rate card | allowance | ctx window | price notice | retirement |
|---|---|---|---|---|---|
| OpenAI | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 |
| Anthropic | 🟢 | 🔴 | 🟢 | 🟢 | 🟢 |
| Google | 🟢 | 🔴 | 🟢 | 🟢 | 🟡 |
| xAI | 🟢 | 🔴 | 🔴 | 🟢 | 🟡 |
| Perplexity | 🟡 | 🟡 | 🔴 | 🟡 | 🔴 |
| Microsoft | ⚪ | 🟡 | 🔴 | 🟢 | 🔴 |
| Mistral | 🟢 | 🟡 | 🔴 | 🟢 | 🟢 |
| DeepSeek | 🟢 | ⚪ | 🔴 | 🟡 | 🟡 |

**This table is generated from `transparency-index.json`, because the hand-typed one had drifted.** It was written before the 2026-08-25 backlog pass and never updated: it showed ⚪ on price notice for Google, xAI, Mistral, Perplexity and Microsoft, and on retirement for DeepSeek, xAI, Mistral and Perplexity — nine cells that the JSON had already graded. Open thread 18 recorded the axis as finished while this table still said it was not. **Regenerate it rather than editing it by hand.**

**The finding is the shape, not any single cell: `allowance` is 🔴 for SEVEN of eight, and it is by far the weakest column.** Providers tell you the price and when it will change; almost none tell you what you get for it. Grounded in `plan-limits.json` — **25 of 27 consumer plans publish no allowance**.

**The one exception is Perplexity, and it is worth knowing precisely.** "Consumer Max plans start with 10,000 credits a month", plus a published conversion (**100 credits = $1**) and typical consumption by task class (light 100–350, complex 350–950, heavy 875–2,275, mega 2,400–9,800). It is the only allowance figure on the table a reader can do arithmetic with. 🟡 not 🟢 because it covers **Computer**, Perplexity's agent product, and Perplexity states in the same breath that "Consumer Pro plans do not start with a set monthly amount" — one surface on one tier. **It had been published since 2026-08-06 and we recorded the column as all-🔴 twice before finding it.**

**Two results that cut against the thesis, kept because a file that only collects supporting evidence is not evidence:** OpenAI and Anthropic both give consumers **30 days' notice** on price rises, effective at next renewal so you can cancel — *better* than the 14 days OpenAI gives developers. And the **context window** is the one number providers have been ADDING rather than withdrawing.

**⚠️ Corrected 2026-08-29 — "OpenAI is alone in publishing a consumer context window" was never true.** Two cells moved 🔴→🟢:

- **Google** publishes a per-plan table on its Gemini Apps limits page: no plan **32k**, AI Plus **128k**, AI Pro & Ultra **1 million** tokens. The Internet Archive shows that table live on **2026-08-14**, eleven days before we recorded it as unpublished.
- **Anthropic** publishes per model rather than per plan: Opus 5 and Sonnet 5 **1M** on all paid plans, Opus 4.8/4.7/4.6 and Sonnet 4.6 **500K**, everything else **200K**, with separate figures for Claude Code and Cowork and a note that Pro needs usage credits for 1M on Opus in Code.

**This sharpens the headline finding rather than weakening it.** Three providers can quantify the size of **one conversation** precisely, and only **one of eight** will quantify **how many** you get. `allowance` is 🔴 for the other seven, and it is the column that decides whether a plan is worth its price. That providers can be exact when they choose to — and are, about context windows — is what makes the allowance silence hard to read as a technical limit.

**Not re-checked on 2026-08-29:** the `context_window` cells for Microsoft, Mistral, DeepSeek and Perplexity still carry 2026-08-25 grades. Two of the three we did re-read were wrong, so treat those four as unverified, not as findings.

**Perplexity 🟡 on rate card is the sharpest single cell:** rates are published but exclude a $5–14 per 1,000 requests fee that for chat-shaped use exceeds the token cost. The number is disclosed; the cost is not.

### The data-practices axis (added 2026-08-25)

Top-level `data_practices` key, same shape as `pricing`. `renderPricing()` was generalised into **`renderAxisMatrix(block, prefix)`**, so a fourth axis is now one `<section>`, one call, and a data block.

**Re-read 2026-08-29 — six cells corrected, a fifth dimension added, and the axis has no ⚪ left.**

| Provider | training default | opt-out | retention | human review | advertising |
|---|---|---|---|---|---|
| OpenAI | 🟢 | 🟢 | 🟢 | 🟡 | 🟢 |
| Anthropic | 🟢 | 🟢 | 🟢 | 🟢 | 🟡 |
| Google | 🟢 | 🟢 | 🟢 | 🟢 | 🟢 |
| Mistral | 🟢 | 🟢 | 🟡 | 🟡 | 🟢 |
| Microsoft | 🟡 | 🟡 | 🔴 | 🟡 | 🟡 |
| DeepSeek | 🟡 | 🟡 | 🔴 | 🔴 | 🟢 |
| Perplexity | 🟡 | 🟡 | 🟡 | 🔴 | 🟡 |
| xAI | 🟡 | 🟢 | 🟢 | 🟢 | 🟡 |

**THE FINDING IS AN ASYMMETRY THE PROVIDERS DOCUMENT THEMSELVES.** At OpenAI, Anthropic and Mistral the paying *business* customer is opted **out** of model training by default while the *consumer* is opted **in** and must find a toggle. OpenAI's own help page carries both halves; Anthropic's Commercial Terms say "Anthropic may not train models on Customer Content from Services" against consumer terms that train unless you opt out. **Same company, same models, opposite default — the difference is which customer had leverage.** Recorded in the axis note, deliberately **not** as a column: grading it would mean grading conduct, which this index does not do.

**⚠️ THE 2026-08-29 PASS FOUND SIX CELLS WRONG, AND FIVE WERE WRONG AGAINST THE PROVIDER.** Every one had been published all along; Wayback confirms the text was live on the day we graded it. **The xAI row was the worst: three of four cells wrong**, all traceable to `x.ai/legal/faq` not rendering for whatever fetched it — the 2026-08-25 snapshot is character-identical to today's bar one footer capitalisation. The FAQ answers "Does SpaceXAI use my content for model training?", gives the exact opt-out path (Settings → Data Controls → "Improve the model"), and answers "Do humans view my conversations?" with the purposes named. **This axis feeds the Subscription Auditor's privacy answer**, so those three cells were wrong in user-facing advice, not just in a table.

**Four results worth keeping:**
- **⚠️ "Google is the only provider that tells consumers humans read some conversations" was wrong, and fell on 2026-08-29 when the column was enumerated rather than sampled.** Three of five 🔴s moved: **Anthropic → 🟢** (a help article titled *"Who can view my conversations?"* — "we automatically de-link your data from your user ID … before any review", "access is limited to a small number of personnel involved in model training"); **OpenAI → 🟡** (human review disclosed, but only for *reported* content); **Microsoft → 🟡** ("we manually review some of the results against the underlying data" to improve its AI — plainer than OpenAI, but Microsoft-wide rather than Copilot-specific). Only **DeepSeek and Perplexity** disclose nothing, and Perplexity's own Privacy & Data collection answers every adjacent question except this one.
- **Google still has the best disclosure on this dimension, for a narrower reason than we used to claim:** it is the only one that ties human review to a *retention period* (three years, de-identified) and to the *state of your privacy settings* — review continues when you turn Activity off.
- **xAI is now 🔴 across all six environmental dimensions and 🟢 on three of four data-practice dimensions.** The sharpest proof in the repo that the axes are independent and must never be averaged — and it only appeared once we corrected our own error.
- **"Microsoft is the only one disclosing that consumer AI prompts feed advertising" is no longer true.** OpenAI began testing ads in ChatGPT (Free and Go, US, from 2026-02-09) and documents it in *more* detail than Microsoft: ad selection uses "the context and intent of your current conversation", and with personalisation on, "Past chats and memory"; ads data is retained up to 30 days after you clear it. Perplexity advertises too. **Candidate 5th column — see open thread 19.**
- **Microsoft still hedges its training default with "in some markets"**, so a user cannot tell their own position.

**The `advertising` column (added 2026-08-29) — the finding is a substitution.** Only **two** providers answer the question a consumer actually has, *are my conversations used to choose the ads I see?* **OpenAI** says yes and documents it: ads on Free and Go from **2026-02-09**, selection using "the context and intent of your current conversation" and, with personalisation on, "Past chats and memory"; advertisers get aggregated data only; ads data kept "up to 30 days" after you clear it. **Google** says no — its Gemini hub carries the question as a heading and answers "Your Gemini Apps chats are not being used to show you ads. If this changes, we will clearly communicate it to you" — while disclosing the carve-out that Gemini shopping-cart and Google Pay data *is* used for ads.

The other six answer an **easier, adjacent question**: whether they *sell or share* your data with advertisers. That is not the same thing — a provider can truthfully say it never sends your prompts to an advertiser while still reading those prompts to pick the ad it serves you. xAI, Perplexity and Anthropic all land there. **DeepSeek and Mistral get 🟢 for stating the non-practice outright** ("WE DO NOT ENGAGE IN TARGETED ADVERTISING", in capitals in DeepSeek's original) — the column grades disclosure, so "we don't do this", said plainly, scores.

**Grade the column on what is disclosed, never on whether ads exist.** OpenAI runs the most invasive ads product here and earns 🟢 for describing it precisely; that is the grade working as intended, and reversing it would turn this axis into a conduct score.

**Two coexisting scales — deliberate, don't "fix" it.** The page grades **public knowability** on a **4-state** scale: 🟢 Transparent (company discloses itself) · 🟡 Partial (a real figure is public but only via a regulator/utility/watchdog) · 🔴 Opaque (nothing public) · ⚪ Not yet assessed. **Below** the summary is the older **"Disclosure quality by dimension"** matrix (7 providers × 6 dimensions) with its **own 3-state legend** (it grades a company's *own* self-reporting completeness). Same provider can read 🟡 up top and 🔴 in the matrix — the matrix's lead-in explains the different lens. **As of 2026-08-25 all seven rows have been re-read from primary documents** (see FRESHNESS §E1/§E1b); the matrix is no longer the un-revisited layer it was.

**Scoring (computed in `renderEnv()` from `datacenters.json`):** water_grade → value transparent 3 / partial 2 / opaque 1; **no grade ⇒ excluded**. `providerScore = Σ(value × power_mw) / Σ(power_mw)` over that provider's assessed sites with non-null MW; null-MW sites display but don't move the average. Buckets: ≥2.5 🟢 · 1.5–2.49 🟡 · <1.5 🔴 · none ⚪. Each provider card is a `<details>` with expandable **"show the math"**; every site links sources.

**Coverage:** **12 sites / 7 providers** (Google 🟢, Amazon/Anthropic 🟡, xAI 🟡, Oracle/OpenAI 🟡, Microsoft 🔴, Meta 🔴, CoreWeave 🔴), **all 12 re-verified 2026-08-25** (`last_updated: 2026-08-25`). CoreWeave's 🔴 comes from an **unweighted mean** — it is the one provider whose only site has no `power_mw`, and `renderEnv()` falls back rather than returning ⚪. Grades were hardened through a watchdog-then-primary-source pass (e.g. Meta Hyperion & Amazon Canton corrected 🔴→🟡 on permit/utility figures; Microsoft Atlanta 🔴 on no site figure). Colocation landlords (Equinix/NTT/CyrusOne) aren't scored yet (they publish fleet-wide efficiency, not per-AI-site figures).

**Disclosure matrix as of 2026-08-25** (`transparency-index.json`, `last_verified: 2026-08-25`, all seven rows re-read from primary sources, `source_url` 42/42):

| Provider | site | AI split | comparability | replenish | energy src | verification |
|---|---|---|---|---|---|---|
| Google | 🟢 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Amazon (AWS) | 🟡 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 |
| Microsoft | 🟢 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 |
| Meta | 🟡 | 🔴 | 🟡 | 🟡 | 🟡 | 🟡 |
| xAI | 🔴 | 🔴 | 🔴 | 🟡 | 🟡 | 🔴 |
| OpenAI | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |
| Anthropic | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 | 🔴 |

**Re-read 2026-08-29. The clean story — "the hyperscalers disclose, the AI-native labs do not" — survived, but the tidy version of it did not.** Google is the benchmark: 36 named locations with withdrawal, discharge *and* consumption, inside assurance scope. Microsoft: 29 locations, withdrawal only, **outside** assurance. Amazon: per-Region PUE/WUE **ratios** publicly, absolute volumes only as a global total or inside a paying customer's console. Meta: per-facility electricity and emissions, no per-site water.

**⚠️ xAI is no longer 🔴 across all six, and the row used to say things that were false.** It runs a public Memphis site (`x.ai/memphis`) publishing turbine counts and permit dates, emissions-control specification (SoLoNOx DLE + SCR, NOx to 2 ppm), substation spend, and the **Colossus Water Recycle Plant** — $80M, "up to 13 million gallons of wastewater daily", projected to "conserve approximately 4.745 billion gallons of water annually".

- `replenishment` 🔴→🟡 — the old note said xAI "has not even asserted a goal". It had asserted one, with a volume.
- `energy_source` 🔴→🟡 — the old note ended "xAI itself still discloses no energy mix". It discloses what powers the site, in detail.
- `site_level` **holds 🔴**, but its note claimed "no corporate environmental disclosure of any kind" and that every Colossus figure came from utilities or watchdogs "never from xAI". Both false. The grade holds for the right reason: **xAI publishes no figure for the water or electricity Colossus actually uses.**

**The trap this row illustrates:** a company can publish a great deal about a site and still disclose nothing this column grades. Infrastructure specs, permits and projected savings are not usage figures. Grade the number the reader needs, and say in the note what the company *does* publish — otherwise the cell reads as a lie to anyone who has visited the page.

**Anthropic's 🔴 is now a measurement, not an assertion.** Full-text census of the Transparency Hub (121,341 chars): water 0, energy 0, carbon 0, emissions 0, climate 0, electricity 0. Published in the cell so a reader can re-run it. **OpenAI's cells were re-checked and held** — the careful wording from the 2026-08-28 pass survived contact with the sources, which is the counter-example worth keeping.

**Nobody splits AI from general load** — that column is the one real remaining gap, and for OpenAI and Anthropic it is moot because they publish no environmental total at all.

**A second date to watch, and it is voluntary.** On **2026-06-23** the UN Secretary-General launched the **AI Environmental Transparency Initiative**, asking every major AI company to disclose full carbon, water and land footprints and to run data centres on renewables by 2030. Two months on, **no provider on this table has been named as signing up**, and no grade has moved because of it. The harder deadline is still California **SB 253** in November 2026.

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

## 9. Work history — 2026-07-13 and earlier (current state is §0)

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

- **✅ v6.14 uploaded 2026-08-28, awaiting review (see §0).** Ships the rebuilt water model. The long-running store gap — a pre-2026-08-02 build with the ~2× billed-input and ~51× image-token bugs and the false ±8% band — was closed by v6.13 on 2026-08-24, which appears to have published since the store would otherwise have blocked this upload. Note that a shipped build freezes its bundled prices (see the promo warning in §0).
- **v6.12 was rejected 2026-07-29 for listing copy, not code** (excessive keywords — the nine-platform list). Copy is fixed; **v6.13 went up 2026-08-24 and v6.14 on 2026-08-28**. Note for next time: it still adds the `generativelanguage.googleapis.com` host permission, so expect permission re-review and a user-facing notice regardless. **Name supported platforms at most once, in prose, and never in the short description** — the standing rule is at the top of `extension/STORE-LISTING.md`.
- **Sonnet 5's intro rate is now PERMANENT** — Anthropic cancelled the 2026-09-01 rise to $3/$15 and $2/$10 is the standard price (its pricing page, 2026-08-24). This was the nearest-term dated task in this file; there is nothing to do on 31 August.
- **`grok-build-0.1`, Sonar Deep Research, Magistral / Devstral / Ministral and Codex are deliberately untracked** — specialist or non-consumer-chat models. Adding any means inventing a `water.json` tier, so decide rather than default.
- **Mistral HAS rebranded Le Chat → "Vibe"** (confirmed 2026-08-24). Plan keys deliberately unchanged — they are the join key across `prices.json`, `plan-limits.json` and `audit.html`; the rebrand lives in the plan `note`. Renaming means changing all three in one commit.
- **Google AI Ultra's "5× Pro limits" note is now sourced** — gemini.google/subscriptions states the $99.99 tier at 5× and the $199.99 tier at up to 20×, so the note matches the evidence. The 20× tier's price was also corrected $200 → $199.99.
- **The AI Clock's `frontier` counter is unverifiable and now says so.** No 2026 record training run is publicly confirmed; it's projected from Grok 4 (mid-2025) at 4.5×/yr. Epoch's central rate estimate is 5× (CI 4–6×), left unchanged as it's within the interval. Don't quote the frontier level as sourced.
- **Gemini's reasoning multiplier is the last unmeasured one that matters, and it is BLOCKED.** AI Studio refused to issue a key on 2026-08-28 — *"failed to generate key, the request was suspicious"* — on a personal Gmail with no VPN, which rules out the two usual causes and leaves no diagnosable signal. The measurement itself is free (`gemini-3.1-pro-preview` has a free tier), so this is blocked on access, not cost. Retry in a few days, or write the Vertex AI path (~an hour). Meanwhile the row is labelled an estimate everywhere it renders, and given four out of four guesses were high, assume this one is too.
- **`clock.json` levels have no plausibility guard** — see §0 open thread 9.
- **Fast mode is unmodelled on purpose** — Anthropic bills Opus 5 / 4.8 at $10/$50 under it, OpenAI renamed "priority" to Fast mode 2026-07-30. Opt-in API service tiers like batch or caching, not the default consumer rate.
- **DeepSeek's price rise LANDED** (found 2026-08-24): ~3× input, ~4.5× output, plus peak/off-peak metering by UTC clock time — the only provider here that bills by when you use it. Stored rates are the **peak** ones on purpose; see §0. Still the cheapest provider tracked, by a much narrower margin, with no indication that's the end of it. **The Auditor's downgrade advice leans on DeepSeek hardest, so this is the number to re-check first each time.**
- **Time-limited promotional rates are now machine-checked**, not prose. A promoted model carries `promo: { until, standard:{input,output} }` in `prices.json`, and `check-prices.js` fails once `until` passes, naming the rate to revert to. Live on `gemini-3.7-flash` and `gemini-3.6-flash` (half price to 2026-12-31). Add the block whenever a provider quotes a rate with an end date — that is the whole point of it.
- **Transparency Index:** all three axes are scored — **this line used to say "env-only; pricing/data axes are ⚪" and had been wrong since 2026-08-25**, which is the same drift the §7 pricing table showed. One ⚪ remains by design (Microsoft's API rate card). The two-scale design is intentional — don't "reconcile" xAI's 🟡-vs-🔴 by mistake (documented in `_meta.detail.note`). Colo landlords not scored yet; a couple of `power_mw` values are third-party estimates (don't change a badge).
- **Auditor caveats:** plan caps are approximate (rolling-window/compute-based limits); the per-model API cost skips models not in `prices.json.api` (undercount risk); API ≠ the product (no app/limits/features).
- **`update-prices.js` is not a real scraper** — hardcoded values, only Anthropic/OpenAI/Google; other providers change by hand.
- **The AI Clock is a modeled projection** — re-anchor quarterly.
- **`README.md`** is extension-focused and somewhat stale.
- **Google Fonts** load from `fonts.googleapis.com` on site pages (the privacy wart) — consider self-hosting.
- **Stale branches: cleared 2026-08-26** — 25 remote and 24 local deleted, all verified merged first; the remote went from 27 branches to 2. **This line used to name `docs/project-context-2026-07` as a superseded branch to delete, and that was wrong in the dangerous direction: it is not merged.** `FRESHNESS.md` J1 had already caught the error and said so; this copy never got the correction — a second list of the same fact, drifting, which is the failure this repo keeps paying for. **Keep no list here.** Two branches survive because they hold unmerged work — `feat/subscription-auditor` (3 commits, including "Meta Muse Spark 1.1", which appears nowhere in `main`) and `docs/project-context-2026-07` — and the open question on each is in FRESHNESS J1, which is the only place that tracks them.
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

**Both traps are handled by the build script — use it rather than zipping by hand:**

```bash
node scripts/build-extension.js
```

It writes the archive itself (deflate via `zlib`, forward slashes, zero dependencies) and **refuses to build** if `prices.json._meta.version` disagrees with the manifest, if `manifest.description` names any of the nine products or drifts from `STORE-LISTING.md`, or if a required file is missing. `--check` verifies without writing. See FRESHNESS **H0**.

Verify before uploading with an *independent* implementation, not the writer that produced the zip — FRESHNESS H0 has the one-liner. Check: no backslashes in entry names, `manifest.json` at root with the right version *inside* the zip, `fonts/` and `icons/` present. `*.zip` is gitignored, so the artifact won't be committed.

> Note: `release.yml` builds with `cd extension && zip -r ..` on Linux, which is correct, but it does **not** exclude `STORE-LISTING.md` / `STORE-SUBMISSION.md` — CI zips still contain them. Harmless, but the two paths differ.

### Store submission fields
Everything the dashboard asks for is pre-written — don't recompose it from scratch:
- `extension/STORE-LISTING.md` — short + detailed description, category, pre-upload checklist.
- `extension/STORE-SUBMISSION.md` — single purpose, per-permission justifications, remote-code answer, data-usage disclosure (**"Website content" only**, with reasoning), and a paste-ready explanation that the Auditor export is a local file save, not an upload.
- **Redeploy the hosted privacy policy in the same release as the zip** — the store checks the URL resolves and that the policy matches the permissions requested.
