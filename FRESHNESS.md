# FRESHNESS.md — everything here that rots

This repo publishes numbers about other people's products. Those products change
and we don't get told. This file is the complete list of what goes stale, where
each thing lives, what to check it against, and which script proves the fix.

**It exists so one prompt can re-verify the whole project.** Everything below is
written to be executed, not just read.

_Last full pass: **2026-08-25** — A, B, C, D, F verified 2026-08-24 and current.
**E is now fully verified**: all 12 datacenter sites re-checked (backlog cleared,
`last_updated` earned for the first time since 2026-07-13), and the Transparency
Index completed — Microsoft's per-site disclosure found in the fact sheet (the
first grade movement this index has recorded), Google/Meta/Amazon re-read from
current reports, and the **pricing and data-practices axes defined and scored**,
so all three axes are live and 114/114 cells are sourced. G, H were blocked on
things only Rory could do — **H closed 2026-08-24 when v6.13 went to the store.**
I, J done. Two guards added 2026-08-24. Update this line when a pass completes._

_**2026-08-26 — not a full pass; two targeted jobs.** (1) **The Subscription
Auditor's question section was audited** and three of its eleven questions turned
out to change nothing: `priority` was read by no code at all, `frequency` moved
only a cosmetic badge, and `media` asked about voice while gating on images. Four
stale facts went with them — an export instruction naming a button that never
existed, four of ten paid tiers unselectable (a Max 20× payer was shown a saving
$100/mo too small), a frontier example the engine deliberately ignores, and a
hand-typed month/count/deadline in the student copy. Six new guards in
`check-auditor.js`, each verified by injecting its fault; `test-auditor.js` now
sweeps `priority` (225,000 combinations). **New entry B5** — the days-per-month
assumption this created. PR #35. (2) **J1 cleared** — 25 remote and 24 local
branches deleted, two unmerged ones kept and documented. **All six guards pass.**_

---

## The one prompt

```
Work through FRESHNESS.md. Re-verify every entry, fix what has drifted,
and report per entry: current / fixed / needs Rory. Run the verification
suite at the end and don't stop until it passes.
```

Narrower runs are fine and cheaper — the section letters are the handles:

```
Work through FRESHNESS.md sections A and B (prices and plan limits) only.
```

```
Work through the FRESHNESS.md dated calendar. Anything due or overdue.
```

---

## Rules that apply to every entry

These are not style notes. Each one exists because breaking it has already put a
wrong number in front of a user.

1. **Verify against a provider-owned page, and prefer the help centre to the
   pricing table.** The pricing table is written to sell; the help article is
   written for people already paying. On 2026-08-08 the table implied GPT-5.5 was
   paid-only while the help article said it was still the default. The help
   article was right.
2. **Ask "what is the status right now, and when was it last true" —** not "does an
   offer exist", and not "has it expired" either. Google's student year closed
   2026-04-30 while the whole internet went on describing it as live, then
   relaunched before 2026-08-24 while *we* went on describing it as dead. Both
   directions rot, and the second one is the one that costs the reader money. See
   C1.
3. **"Not disclosed" is a finding. Never fill a gap with a plausible number.** If
   a provider withdraws a figure, record the withdrawal — don't fall back to the
   old one and don't invent a replacement.
4. **Where a file carries both a number and a sentence describing it, check them
   against each other.** Divergence between the two is the cheapest reliable
   smell in this repo. The capex level was 35% high while the prose beside it
   quoted the correct guidance, and that survived a full quarter.
5. **A figure can pass every script and still be wrong.** The scripts check form
   and internal agreement, not plausibility. Nothing here validates a level
   against the outside world.
6. **Plan-name strings are join keys** across `prices.json`, `plan-limits.json`
   and `audit.html`. Renaming one orphans rows in the other two. If a provider
   rebrands, confirm first, then change all three in one commit.
7. **Update the provenance, not just the value.** `last_verified` / `as_of` /
   `_meta.verified` should say *what you checked and what had moved*, the way
   `prices.json._meta.verified` does. A bumped date with unchanged prose is a
   claim you didn't make.
8. **Never upgrade an estimate by editing it.** `capSource`, `provenance` and the
   accuracy bands are the honesty layer. A number moving from `estimate` to
   `disclosed` requires a provider page saying so.
9. **A file nothing checks is a file that is wrong.** If you add a data file, or a
   seventh copy of an existing one, add it to a guard script in the same commit.

---

## Dated calendar — hard deadlines

| Date | What | Entry |
|---|---|---|
| **2026-12-31** | **Google's free student year must be CLAIMED by this date** — 12 months of AI Pro (US) / AI Plus (intl). The single largest saving available to a student in anything we track, ~$240. | [C2](#c2-known-dated-offers) |
| **2026-12-31** | **Google's promotional rate on `gemini-3.7-flash` and `gemini-3.6-flash` expires** — half price reverts to $1.50/$7.50. Guarded by `check-prices.js`. | [A6](#a6-promotional-rates) |
| Rolling | **Google student year auto-converts to $19.99/mo** 12 months after each user claims it. We can't date this centrally — it's per-user — which is exactly why the Auditor copy has to warn about it at claim time. | [C2](#c2-known-dated-offers) |
| 2026-10-01 | `roll-clock.yml` fires (09:00 UTC, quarterly). Opens a mechanical PR that is **not** a re-anchor. | [D1](#d1-clockjson-anchor-levels-and-rates) |
| Every Monday | `publish.yml` fires (09:15 UTC) — refreshes prices, builds, uploads a CWS draft. | [A1](#a1-per-token-api-prices), [G5](#g5-extension-version) |
| June 2027 | ChatGPT for Teachers free window ends (US K-12). | [C2](#c2-known-dated-offers) |
| Daily, by clock | **DeepSeek meters peak/off-peak by UTC time** — the only provider here that does. We store peak rates deliberately. | [A5](#a5-dated-price-events) |
| ~~2026-08-31~~ | ~~Sonnet 5 intro rate ends~~ — **resolved 2026-08-24.** Anthropic made $2/$10 permanent; the rise to $3/$15 will not occur. | [A5](#a5-dated-price-events) |
| ~~No date~~ | ~~DeepSeek's warned price rise~~ — **landed 2026-08-24**, ~3× input / ~4.5× output. | [A5](#a5-dated-price-events) |
| ~~No date~~ | ~~Mistral "Vibe" rename~~ — **confirmed 2026-08-24.** Product is branded Vibe; the `Le Chat Pro` plan key is kept as the cross-file join. | [A2](#a2-consumer-subscription-prices) |
| ~~Blocking~~ | ~~Store build materially wrong, fix unshipped~~ — **v6.13 uploaded 2026-08-24**, awaiting review. Top item since 2026-08-02. | [H4](#h4-the-shipped-build-vs-main) |

---

## Don't trust a "current state" list — including this one

This section deliberately doesn't enumerate what's broken today, because that list
rots faster than anything it would describe. **While this file was being written,
the working tree changed three times**: a price refresh landed, `audit.html` fell
five checks behind it, and a promo-expiry guard was built into `check-prices.js`
that made a paragraph here wrong within minutes.

**So: get the live answer, don't read it.**

```bash
node scripts/check-prices.js && node scripts/check-auditor.js
```

The one durable observation from that episode, because it has now happened three
times (2026-08-02, 2026-08-08, 2026-08-24): **`audit.html` is updated last, or not
at all.** It's the sixth copy of the price table, `check-prices.js` never opens it,
and the DeepSeek rows are the ones that bite — the Auditor priced pay-per-token at
a third of the real rate for the provider its downgrade advice leans on hardest.
**After any change to section A, run `check-auditor.js` before you believe you're
done.**

---

## Order of operations

Some entries feed others. Run them in this order or you'll verify a copy against
a source you're about to change.

1. **A** — prices and models (`prices.json` is upstream of five other files)
2. **B** — plan limits and caps
3. **C** — student access
4. **F** — water tiers (needs A's final model list)
5. **D**, **E** — clock, transparency index (independent of the above)
6. **G**, **H** — extension and store (needs A and B settled)
7. **I**, **J** — copy, docs, hygiene (they describe everything above)
8. **Verification suite** — last, all seven

---

# A. Prices and models

## A1. Per-token API prices

**Goes stale:** constantly. OpenAI cut two models ~5× overnight on 2026-08-02.

**Source of truth:** `extension/prices.json` → `api` (7 providers, ~50 models).

**Copies that must follow — all four drift silently:**
- `pricing.html` → `FALLBACK_PRICES`
- `audit.html` → `API`
- `extension/sidepanel.js` → `FALLBACK_API`
- `scripts/update-prices.js` → hardcoded values (Anthropic / OpenAI / Google only; every other provider is by hand)

A drift here only shows when the live fetch *fails*, which is exactly why it rots
unnoticed. `gemini-3.5-flash` sat at a third of its real rate in `audit.html` for
ten days, biasing advice toward "drop your plan and pay per token".

**Verify against** (the list `_meta.verified` already names):
platform.claude.com/docs/en/about-claude/pricing · developers.openai.com/docs/pricing ·
ai.google.dev/gemini-api/docs/pricing · docs.x.ai/docs/models ·
api-docs.deepseek.com/quick_start/pricing · mistral.ai/pricing/api ·
docs.perplexity.ai/getting-started/pricing

**Also check the `long` block** (context-threshold rates). Thresholds today are
OpenAI >272k, Google >200k, xAI ≥200k; Anthropic doesn't tier this way. Ignoring
`long` undercounts long conversations by roughly 2×, in the *opposite* direction
to the unmodelled prompt-caching discount — they do not cancel out.

**Then rewrite `_meta.last_updated` and `_meta.verified`** — the prose should name
what moved and what didn't.

**Guard:** `check-prices.js`, `check-auditor.js`

## A2. Consumer subscription prices

**Goes stale:** less often, but sharply. Google AI Plus went $7.99 → $4.99;
Copilot Pro finished retiring 1 Aug 2026.

**Source of truth:** `extension/prices.json` → `subscriptions` (26 plans).

**Copies:** `plan-limits.json` → `plans` (joins on `p` + `m`) · `audit.html` →
`PLANS[].price`

**Watch:** plan names are the join key (rule 6). **The Mistral case is now
settled and is the worked example:** Mistral does brand the product "Vibe"
(confirmed 2026-08-24), and the plan key stayed `Le Chat Pro` anyway, with the
rename recorded in the row's `note`. A display name changing is not a reason to
change a join key.

**Recent movement (2026-08-24):** xAI added a **SuperGrok Plus** tier at $100;
Google AI Ultra (20×) corrected $200 → $199.99. A new tier means a new
`plan-limits.json` row and a new `audit.html` entry, or `check-prices.js` fails on
"subscription with no plan-limits entry".

**Guard:** `check-prices.js`, `check-auditor.js`

## A3. The model line-up

**Goes stale:** a new flagship every few weeks; old keys quietly vanish from
provider pages.

**Everywhere a model name lives — all seven must agree:**
- `extension/prices.json` → `api` (the rate)
- `extension/water.json` (a tier, or the water figure silently renders as nothing)
- `pricing.html` → `MODEL_REGISTRY` (display + order)
- `extension/sidepanel.js` → `MODEL_CATALOG` (the picker)
- `audit.html` → `PLANS[].models`, `MODELS`, and the `API` fallback
- `extension/prices.json` → `free_tiers`
- `plan-limits.json` → `value_models`

**Retiring a model:** don't delete the key. Models no longer on a provider's
current page are retained at last-known rates because they stay selectable in the
picker — record them in `_meta.caveats._legacy_keys` and treat those numbers as
historical, not current.

**Deliberately untracked** — decide, don't default: `grok-build-0.1` ($1/$2),
Sonar Deep Research, Magistral / Devstral / Ministral, Codex. They're specialist
or non-consumer-chat models, and adding any means inventing a `water.json` tier.

**Added 2026-08-24:** `gemini-3.7-flash` (promotional — see A6) and `grok-4.6`,
both with `water.json` tiers in the same commit, which is the pattern to copy. 68
models priced, 47 shown, 13 with long-context tiers, 27 plans as of that refresh —
those counts come from `check-prices.js` output and are worth pasting into a pass
report, since a change in them is the fastest signal that structure moved.

**Guard:** `check-prices.js` (water parity + "shown on page but unpriced"),
`check-auditor.js`

## A4. What the free tiers include

**Goes stale faster than prices, and it moves the Auditor's whole answer.**
ChatGPT Free became unlimited text chat; Gemini's free app already has the 3.1 Pro
flagship.

**Source of truth:** `extension/prices.json` → `free_tiers` (drives the extension
picker) and `audit.html` → the price-0 row of each `PLANS` provider.

**Why it matters more than it looks:** `advancedModels()` derives itself from the
free rows, so a wrong free tier misreads a paying frontier user as a free-tier
one. And `TOP_IS_FREE` (`google`, `microsoft`, `deepseek`) encodes *"paying buys
quota and features, never smarter output"* — if one of those providers starts
gating its best model behind a paywall, that set is wrong and the Auditor will
stop recommending an upgrade that has become justified.

**The failure mode to hunt for:** a free tier capped in our data but advertised as
unlimited pushes a user to pay for volume that now costs nothing. That was the
single most expensive error found on 2026-08-08, and it pointed at the user's
wallet.

**Moved on 2026-08-24 — all four are the kind of change that silently invalidates
a recommendation:**
- **GPT-5.5 has finished leaving ChatGPT Free.** On 2026-08-08 that rollout was mid-flight and the honest record was "still there, limited". It has now completed: OpenAI files GPT-5.5 under "Legacy models" (Free: No, Go: No). Free is Luna + Thinking Mini only.
- **Gemini's free default is now 3.6 Flash**, not 3.5.
- **xAI's free app runs Grok 4.6** — x.ai ticks 4.6 in every column including Free, so **xAI gates on rate limits, not model access.** If xAI is ever added to the Auditor it belongs in `TOP_IS_FREE`.
- **Copilot's model mapping is now recorded as not disclosed.** Microsoft publishes no mapping for any consumer tier; GPT-5.5 is a stand-in for pricing only. Don't present it as Copilot's model.

**Guard:** `check-auditor.js`, `test-auditor.js` (sweeps all 56,250 combinations)

## A5. Dated price events

**Two long-standing items closed on 2026-08-24. Both closed the opposite way to
the obvious guess, which is the argument for checking rather than assuming.**

- **Sonnet 5's introductory rate did not expire.** $2/$10 per 1M was listed
  "through 2026-08-31" and every plan assumed a rise to $3/$15 on 1 September.
  Anthropic made the introductory rate permanent instead. `_meta.caveats
  ['claude-sonnet-5']` now records the resolution. **No action at the end of
  August** — and note that the doomed assumption here was ours, not a provider's
  claim.
- **DeepSeek's warned increase landed.** `deepseek-v4-flash` went
  $0.14/$0.28 → $0.44/$1.32 and `v4-pro` $0.435/$0.87 → $1.32/$3.96 — roughly 3×
  input and 4.5× output. It is still the cheapest provider tracked but by a far
  narrower margin, and **the Auditor's "drop your plan and pay per token" advice
  leaned on the old numbers hardest.** Re-check every downgrade recommendation
  that reaches DeepSeek.

**DeepSeek now meters by clock time, which nothing else here does.** Peak is
01:00–04:00 and 06:00–10:00 UTC Monday–Friday; every other hour is half price.
**The stored rates are the peak (undiscounted) ones, deliberately** — off-peak is
a discount you only get if your usage happens to fall outside a window you don't
control, and quoting the cheap rate would understate the cost of the exact advice
this project is most likely to give. Off-peak is exactly half of every stored
figure. Don't "correct" this to a blended rate.

**Deliberately unmodelled:** Fast mode / priority service tiers (Anthropic bills
Opus 5 / 4.8 at $10/$50 under it; OpenAI renamed priority → Fast mode 2026-07-30).
These are opt-in service tiers like batch or caching, not the default consumer
rate. Leave them out — and don't quietly start modelling them.

## A6. Promotional rates

**A new class of time bomb, added 2026-08-24.** Some stored rates are time-limited
promotions rather than standing prices. They carry a machine-readable block:

```json
"promo": { "until": "2026-12-31", "standard": { "input": 1.5e-06, "output": 7.5e-06 } }
```

**Currently promotional:** `gemini-3.7-flash` and `gemini-3.6-flash`, both at half
price through **2026-12-31**, reverting to $1.50/$7.50.

**Record the standard rate at the moment you record the promo.** Going back to
find what a price *was* after the promo expires is how this data rots — and it's
why the `standard` sub-object exists rather than a bare date.

**Guard:** `check-prices.js` — it walks `api`, rejects a malformed `promo` block,
rejects a "promo" equal to its own standard rate, and **fails once `until` is in
the past**, naming the standard rate to restore. Its pass line reports the count
(`68 models priced, 2 on promotional rates, …`), so a promo silently disappearing
is visible too.

This is the one entry in this file that **cannot** go stale unnoticed, and it's
the model for the rest: a dated figure with a machine-readable expiry and a script
that fails on it beats a calendar entry and a human remembering. Where another
entry here relies on someone reading this document on time, that's a gap worth
closing the same way.

---

# B. Plan limits, caps and disclosure

## B1. The caps themselves

**Goes stale in one direction:** providers are *withdrawing* figures, not adding
them. Between 2026-07-28 and 2026-08-08 OpenAI deleted the only general absolute
cap anyone published.

**Source of truth:** `plan-limits.json` → `plans[]`, each carrying a provenance:
`disclosed` / `derived` / `third_party` / `not_disclosed`.

**Copies:**
- `pricing.html` → `FALLBACK_LIMITS` — a **seventh** copy of this data, 26 rows, all diffed by `check-auditor.js`
- `audit.html` → `PLANS[].cap` + `.capSource` — uses `estimate` where `plan-limits.json` says `not_disclosed`, because the Auditor needs a working number. **Only `disclosed` may be shown to a user as fact.**

**Verify:** help centre first (rule 1). A figure being here today is not evidence
it will be next quarter — check each surviving figure is *still on the page*, not
just that you once found it.

**When a cap disappears:** move the row to `not_disclosed`, append the deletion to
`_meta.disclosure_is_getting_worse`, and then grep for prose asserting the deleted
number. Both the `pricing.html` callout and the lede had to be rewritten last
time, because they stated the withdrawn cap in words.

**Scope trap:** Go's "10 Thinking messages / 5h" is a *feature* sub-limit, not a
general allowance. It carries `scope_limited: true` and `capPerDay()` refuses it.
Pricing a plan off a feature sub-limit while ordinary chat is unlimited puts the
ceiling far below the plan's real worth. Don't "fix" that refusal.

**Guard:** `check-auditor.js`

## B2. The disclosure findings (prose)

**Goes stale silently**, because it's prose and no script reads English.

- `plan-limits.json` → `_meta.finding` — currently claims *exactly one* absolute
  consumer figure is published anywhere. **Re-derive it from the rows every pass.**
  Count the `disclosed` rows and make the sentence match; don't carry it forward.
- `plan-limits.json` → `_meta.disclosure_is_getting_worse` — append-only history
  of what was withdrawn and when.
- `student-access.json` → `_meta.finding` — same treatment (see C1).
- `pricing.html` → the Break even / Ceiling callout and lede copy.

## B3. Tokens-per-message archetypes

**These are assumptions, not measurements**, and they are the largest single lever
on every figure in the Break even column.

**Where:** `plan-limits.json` → `_meta.archetypes`. Round numbers chosen to be
legible. `audit.html` maps onto the same three archetypes so both tools tell one
story — they disagreed ~6× before 2026-08-08, and the dollar totals happened to
land close through offsetting errors, which is luck, not correctness.

**The fix, when it's available:** anchor to a real EcoMeter usage export (v2,
which carries billed input). The number to use is
`billed_input_tokens_per_day ÷ user_turns_per_day`. **Blocked on a shipped build**
— see H4.

**Until then:** never describe them as measured. Each pass should confirm the
"THESE ARE ASSUMPTIONS" comment is still in the file and still true.

## B5. Days-per-month (the Auditor's duty cycle)

**Added 2026-08-25, and it is an assumption of ours, exactly like B3.**

**Where:** `audit.html` → `ACTIVE_DAYS` — `rarely:4`, `fewWeek:12`, `mostDays:24`,
`manyDay:30`, `constant:30`. Nowhere else; it has no copy in another file.

**What it fixed:** the quiz asks volume "on a busy day", and the engine was
multiplying that by a flat 30 to get a monthly API bill. For anyone who isn't
daily that overstated the API side several-fold, which made every subscription
look better than it was — and `frequency`, the question that knows the answer,
fed nothing but the cosmetic level badge. Volume for **cap** checks is still the
busy day (a cap bites on your worst day); only the monthly bill and the
break-even comparison use the average.

**The direction that matters:** an unknown or unanswered frequency falls back to
**30, never lower**. Understating an API bill is the error that argues someone out
of a subscription that was actually the cheaper option — the same asymmetry A1
records for DeepSeek.

**`manyDay` and `constant` are both 30 on purpose.** They describe intensity
*within* a day, which the messages question already measures. If a future edit
makes them differ, that is a real change of meaning, not a tidy-up.

**The fix, when it's available:** the same one as B3 — a real EcoMeter export.
The export averages **per active day** but cannot say how many active days a month
there are, so this stays the reader's answer to give even on the connected path.
That is why the import resumes the quiz at the frequency question.

## B4. Does the Ceiling column still earn its place

**As of 2026-08-08 it computes for zero plans.** That's deliberate — an empty
column *is* the finding, and the copy says so.

**Check each pass:** if a re-verify finds the third-party-corroborated figures
have gone too, the column becomes 26 identical cells and should probably become a
single sentence instead. Flag it; it's a scope call, not a fix.

---

# C. Student and teacher access

## C1. The routes

**Goes stale regionally and without notice.** Every route carries its own `as_of`;
anything older than a month or two needs a re-check.

**Source of truth:** `student-access.json` → `routes[]`, provenance one of
`disclosed` / `institutional` / `unverified` / `paused` / `none`.

**Read by:** `audit.html`, when the user says they're a student or teacher.

**Rule 2 matters more here than anywhere else in the repo.** Ask what the
redemption deadline was and whether it has passed. Do not ask whether an offer
exists — the internet will tell you yes for offers that closed months ago.

**Third-party sources are rejected on principle:** several quote Google AI Pro at
$28.99/mo when Google's own page says $19.99, and every site claiming a Claude
coupon code is selling something.

**Guard:** `check-auditor.js` (joins on `p`) — and since 2026-08-26 it also measures
**how old each `as_of` is**: a warning at 45 days, a hard fail at 90, plus the same
fail on `_meta.last_verified`. The "a month or two" rule had lived only in the file's
own caveats, which is exactly how the Google year got missed — a route saying *no offer
exists* has no `claim_by` to expire, so age is the only signal there is. Verified by
injecting both faults.


## C2. Known dated offers

_All six re-verified 2026-08-24. Two changed, both in the direction that had been costing students money._

_**Re-verified again 2026-08-26** against provider-owned pages. No status changed — Google, GitHub and Mistral still `disclosed`, OpenAI and Anthropic still nothing for individuals — but three of our own lines were wrong and are fixed:_

- _**Google's excluded-countries list was hung off the wrong offer.** Bolivia, Albania, Canada, Macau, Hong Kong and Tunisia are excluded from the **international AI Plus** offer (footnote 3), not the US one — and that footnote excludes the US too. Our version implied a Canadian student could claim the international year; they are eligible for neither. New caveat in the file._
- _**SheerID was stated as fact for the main offer.** Footnotes 1 and 3 say only "Offer Terms apply"; SheerID is named in footnote 5, the YouTube bundle. Softened to "a school email address"._
- _**"Code completion is unlimited" on Copilot Student is not disclosed.** GitHub's plans page puts the 2,000-completions-a-month cap on Copilot **Free** and states no figure for Student. Removed; the newly documented "excludes third-party agents" added._

_Confirmed unchanged and verbatim: Google's 31 Dec 2026 deadline, payment method required, $19.99/$4.99 auto-conversion (blog.google, 19 Aug 2026); "Available for free to verified students, teachers, and open-source maintainers" (github.com/education/students); ChatGPT for Teachers free for verified U.S. K-12 educators through June 2027 (chatgpt.com/pricing FAQ); "Verified students can get Mistral Pro for $5.99 / month (normally $14.99)" (mistral.ai/pricing); still exactly nine institution logos on Anthropic's higher-education page, matching our named list. **DeepSeek was NOT re-checked — deepseek.com was blocked by browser navigation permission — so its row still says 2026-08-24.**_


_Since 2026-08-25 a redemption deadline is a **field**, not just prose: `claim_by`
(ISO) plus `claim_label` on the route. `check-auditor.js` **fails once the date
passes**, the same way `check-prices.js` fails on an expired `promo.until` — so
the Auditor cannot go on advertising a dead offer, and its student copy composes
the date rather than hand-typing it. Add both fields to any new dated route._

_Since 2026-08-26 the **rendered page re-checks it too**: `offerLive()` in `audit.html`
is the single place the deadline is compared, and it governs the help text, the route
row (which flips to a `deadline has passed` tag and drops the call to action) and the
student line inside the recommendation card (which disappears). The CI guard only fires
when a build runs; the site is static and can be read long after one._

| Provider | State | Re-check |
|---|---|---|
| Google | **RELAUNCHED.** 12 months AI Pro free (US) / AI Plus (140+ markets), SheerID, **claim by 2026-12-31** (now carried as `claim_by`, guarded). Status `none` → `disclosed`. | Does a *discounted* rate exist for after the free year? Landing page is behind a sign-in — **needs Rory signed in.** |
| GitHub / Microsoft | **PAUSE ENDED.** Free for verified students again, confirmed on github.com/education/students. Status `paused` → `disclosed`. | It is not Copilot Pro — auto model selection only, credit-metered chat. Re-check whether those limits move. |
| OpenAI | No individual student discount. ChatGPT for Teachers free for verified US K-12 educators **through June 2027**; ChatGPT Edu is institutional. Re-confirmed on openai.com. | Confirm the 2027 date each pass — the only forward-dated offer we carry. |
| Anthropic | Nothing for individuals; institutional only, and the institution list is not published. Re-confirmed on claude.com. | — |
| Mistral | $5.99/mo student rate, published on its own pricing page. Product now branded **Vibe**; plan key kept as the join. | Flagged `not_audited` (Mistral isn't in the Auditor yet). |
| DeepSeek | Free anyway; nothing to discount. | — |

> **The lesson this section exists to teach has an inverse, and the inverse is what bit us.** The file has warned since 2026-08-08 that *expired offers outlive themselves*. True — and it did not help, because the failure ran the other way. We checked Google carefully, correctly found the offer dead, wrote it down with sources, and the fact rotted anyway when Google relaunched. **A verified absence expires too.** A false negative is the worse direction here: it costs the reader money and it is invisible, because nobody publishes a correction when a discount quietly comes back. **Re-check the `none` and `paused` rows as hard as the live ones** — on this pass they were the only two that had changed.

## C3. Partner institutions

`student-access.json` → `partner_institutions` is **labelled examples and must
never be rendered as a lookup.** No provider publishes a complete list; Anthropic
shows nine logos with no terms and no directory, and Syracuse's own announcement
calls itself "one of the first", so the set is growing and any snapshot is stale
on arrival.

A partial list rendered as authoritative tells a student whose school is absent
that they can't get access — the opposite of true, and the exact failure this
project exists to prevent. `_meta.why_no_partner_directory` records the reasoning.
Don't "complete" the list.

**The highest-value advice on this page is not a plan comparison:** ask your own
university IT desk or library whether the school already pays for one of these.
It's free, takes a minute, and routinely goes unasked. Confirm that framing
survives any rewrite.

---

# D. The AI Clock

## D1. `clock.json` anchor, levels and rates

**Goes stale by design** — it's a projection, re-anchored quarterly.

**Source of truth:** `clock.json` → `_meta.anchor`, `scenarios`, `rates`.

**Copy:** `ai-clock.html` → the `SCENARIOS` and `RATES` fallback block. Keep it in
sync when you re-anchor, so a failed fetch degrades to the same numbers rather
than to a silently stale year.

**Automation:** `roll-clock.yml`, 09:00 UTC on 1 Jan / Apr / Jul / Oct. **Rolling
is not re-anchoring.** The workflow advances the anchor and slides levels along
their own growth curves — mechanical, and it adds no new real-world data. The PR
body carries the checklist, and that checklist is the actual work:

- Tokens — latest Google / Microsoft / OpenAI disclosures
- Prompts — ChatGPT WAU × messages/day
- Electricity — latest IEA AI-specific TWh
- Capex — latest hyperscaler guidance
- Installed compute — latest Epoch AI H100e estimate
- Frontier training run — latest Epoch record FLOP
- Users — ChatGPT WAU / Gemini MAU
- Growth rates — trim any multiplier reality has undershot

**Then update `_meta.reanchor_log` and `_meta.open_questions`.** They carry the
reasoning between cycles and are the only reason the last re-anchor was cheap.

## D2. Plausibility — now guarded

**Fixed 2026-08-24: `scripts/check-clock.js`.** This was the repo's oldest known
hole — `validate-site.js` checks that `clock.json` is well-formed, not that its
numbers are possible, and a capex level 35% above what four companies had
publicly guided passed cleanly for a quarter.

```bash
node scripts/check-clock.js
```

It asserts three things: `ai-clock.html`'s fallback matches `clock.json`; the
scenarios bracket the published totals recorded in `_meta.plausibility`; and no
single company's own disclosure is an absurd share of our world total. It was
validated by replaying the real bug — the pre-2026-08-08 levels fail it at capex
34.9% off and Google at 80% of all tokens on Earth. It's in CI.

**It covers capex and energy only, deliberately.** Those are the two counters with
a single authoritative worldwide total. Adding invented targets for tokens,
prompts, water, CO₂, users, compute or frontier would launder a guess into a
passing test — worse than no test. `_meta.plausibility.comment` says so, so nobody
"helpfully" completes the set.

**Still do this by hand:** the share bound is a floor, not a substitute for
judgement. Ask whether any single disclosed component takes an implausible share
of a total — that heuristic is what exposed the tokens error, and it generalises
to counters the script can't check.

**When the script fails, it can't tell you which side is wrong** — only that the
levels and the published figure disagree. Either reality moved (re-anchor) or the
levels are wrong (fix them). Resolve that by reading the source it names, never by
widening the tolerance.

**Maintaining the anchors:** at each re-anchor, update `_meta.plausibility.checks`
alongside the levels — a tolerance that passes because the target drifted with the
error is no test at all.

## D3. Page prose vs page numbers

`ai-clock.html` carries a dated narrative for every counter. Rule 4 applies hard
here — three of the four errors in the last re-anchor were prose contradicting the
data sitting next to it.

**Standing traps:**
- **The anchor date renders from `_meta.anchor` into `#anchor-date`. Never hardcode it again.** It was hardcoded as "Jan 1, 2026" and stale for a full quarter.
- Every `<dd>` names sources with dates. Re-read them against the current levels.
- The CO₂ copy must keep saying grid intensity is *part of what the scenarios bracket* — the levels imply 230/309/433 g CO₂/kWh, not a flat "~395–400".
- The fleet-size (">10 GW" vs Epoch's ~30 GW) and user-growth ("~2×/yr" vs ~1.3×) claims were both wrong in prose while `clock.json`'s own `_meta` had them right.

## D4. The counters that can't be verified

- **`frontier`** — no 2026 record training run is publicly confirmed; labs stopped
  disclosing training compute. Projected from Grok 4 (mid-2025) at 4.5×/yr and
  labelled on the page as the weakest number. **Don't quote it as sourced.**
- **`tokens` rate (5×/yr)** — near-term observation supports it (Google disclosed
  7× YoY at I/O 2026); forecasts to 2030 imply ~2.2×/yr. If the next anchor still
  shows 5× diverging from reality, that's the counter to cut.
- **No `unitCost` field, deliberately.** Epoch's ~40×/yr decline measures price at
  *fixed capability*; the per-unit panel measures blended spend per token — a
  different quantity, derived as spend ÷ tokens. `_meta.why_no_unit_cost_field`
  records this so it doesn't get re-added.

---

# E. Transparency Index and datacenters

## E1. `transparency-index.json`

**Re-checked 2026-08-24, and the open question it raised was resolved the same day.
It produced the first grade movement this index has ever recorded:**

> **Microsoft does publish location-level water and power — itself.** Not in the
> flagship report, which is where the last pass looked, but in the companion
> **2026 Environmental Data Fact Sheet, Table 15, "FY25 Datacenter water and
> electricity use by location"**: electricity (MWh), water withdrawal (ML),
> non-potable share and replenishment volume for **29 named locations**.
> `site_level` 🔴→🟢, `replenishment` 🔴→🟡. **The blocker last time was tooling,
> not disclosure** — `pdftotext -layout` reads both PDFs fine; the Read tool cannot
> (this box has no `pdftoppm`). Reach for `pdftotext` first on any provider PDF.

**Four limits are recorded in the cell, and none should be smoothed away:**
metro-area/regional-cluster granularity, not per-building · **withdrawal, not
consumption** (consumption stays global/regional in Table 14) · Microsoft-*owned*
sites under its own operational control only, so leased colo is excluded · and
**Table 15 is in Section 2, which the fact sheet states was outside Deloitte's
limited-assurance review** — Microsoft's most granular figures are its least
assured.

**What to re-check next year:** whether consumption joins withdrawal per location,
and whether Section 2 ever comes into assurance scope. Look in the **fact sheet,
not the report**. URL pattern:
`cdn-dynmedia-1.microsoft.com/.../CSR/<YEAR>-Microsoft-Environmental-Data-Fact-Sheet-PDF.pdf`

**Contains:** page copy (`_meta`: lede, methodology, caveats), the disclosure
matrix (`columns`, `rows` — 7 providers), and the three axes.

**Axes state:** environmental is `scored`; pricing and data practices are `pending`
("criteria not yet defined"). ⚪ is not the same as 🔴 and the copy must keep
saying so.

**Copy:** `transparency-index.html` → `FALLBACK` is deliberately minimal — it
renders an *error state*, not stale data. That's correct. Leave it.

## E1b. The annual provider-report re-read — do this every August

**Added 2026-08-25 after Google and Meta turned out to be a full reporting cycle
stale.** The Microsoft find made us check the others, and both were out of date:
we were citing Google's *2024* Environmental Report and Meta's *2024*
Sustainability Report while the 2026 and 2025 editions had shipped.

**The naming trap — this is what makes staleness invisible.** A provider's report
title is not its data year, and the offset is different per provider:

| Document | Title year | Data year |
|---|---|---|
| Google Environmental Report | 2026 | FY2025 |
| Microsoft Environmental Sustainability Report + Data Fact Sheet | 2026 | FY25 (to 2025-06-30) |
| Meta Sustainability Report + Environmental Data Index | 2025 | CY2024 |

So "Meta 2025" is **older data** than "Google 2026" by a year, and a row citing
"Meta 2024 Sustainability Report" is two cycles behind, not one. **Never compare
providers on title year.** Meta's comparability cell records this explicitly.

**The companion data document is where the granular tables live** — the flagship
report is narrative. This is the single most useful lesson from this pass:

- Google — **2026 Environmental Report**, "Water use by data center location"
  (withdrawal + discharge + consumption, 36 named locations, 8 countries, inside
  assurance scope). <https://sustainability.google/reports/google-2026-environmental-report/>
- Microsoft — **Environmental Data Fact Sheet**, Table 15 (withdrawal only,
  29 locations, **outside** assurance scope). Not the flagship report.
- Meta — **Environmental Data Index**, §2.1 per-facility electricity and §1.1
  per-facility emissions; **no per-facility water** (§3.1–3.4 are aggregate).
  <https://sustainability.atmeta.com/asset/2025-environmental-data-index/>

**Run it with `curl` + `pdftotext`,** not WebFetch — see the note in E1. Google's
report is 98 pages / 23MB; WebFetch will not read it.

**What moved on 2026-08-25:** Google `site_level` note corrected (24 → 36
locations, and it publishes consumption, which we had not recorded); `energy_source`
64% → 65% CFE and emissions ~51% → **62%** above the 2019 base year;
`replenishment` gained the 78%-of-consumption figure. Meta `site_level` rewritten
— it now reports **per-facility electricity and emissions**, which our note denied;
held 🟡 only because per-site *water* is still missing. No grade letter changed for
either provider, but four notes were materially wrong.

## E1c. The four rows finished on 2026-08-25

**Amazon was wrong in both directions.** Our note said "no site-level and no
historical tables"; AWS publishes a **public per-Region table** — PUE 2022–2025,
WUE 2024–2025, by named Region — and the report carries a five-year global WUE
series (0.25 → 0.12). Moved 🔴→🟡 on four cells. **The distinction that matters
and must not be lost:** what is public is *efficiency ratios*; absolute volumes
exist only as one global total (2.5B gal, 2025) or at Region/service/account
granularity **inside a paying customer's AWS Sustainability Console**. Granular
data that only customers can see is not public disclosure — that gap is the whole
reason this project exists, and the cell says so.

**xAI / OpenAI / Anthropic: re-verified, not assumed.** All three stay 🔴 across
all six dimensions, but the finding now rests on Aug 2026 reporting rather than
the Dec 2025 trackers. **A verified absence expires too** — same lesson as the
Google student offer (§C). Anthropic's Transparency Hub is linked directly so the
absence is checkable rather than asserted.

> **The date to watch: November 2026.** California's SB 253 requires Scope 1 and 2
> reporting from large companies operating in the state. If OpenAI and Anthropic
> comply, these rows move for the first time. Both may classify the bulk as
> Scope 3 and delay to **2027**; EU requirements follow by 2029. Re-check in
> November, not next August.

**Conflicting figures were shown as ranges, not picks,** per the standing rule:
xAI's Memphis aquifer draw is cited as ~1.3M–5M gal/day depending on source,
facility and period, and reported turbine counts differ across sources, so no
count is stated.

## E1d. `source_url` is 42/42 — keep it there

`_meta.methodology` says "Every grade links to its sources." Until 2026-08-25
that was **false** — 36 of 42 cells rendered as plain text. It is now true, and all
12 distinct URLs were HTTP-checked.

**If you add a provider or a dimension, add the link in the same commit.** The page
makes a promise about itself; breaking it is the exact failure this index grades
others for.

**Two sources 403 a bare `curl` but load fine in a browser** (Fortune, CNBC) — that
is bot-blocking, not a dead link. Where it happened the cell links to a reachable
equivalent: the syndicated Insurance Journal copy, and SELC's own page. Don't
"fix" those by swapping in the paywalled original.

**Three URL patterns fail a link-checker while being perfectly good links.** Do not
remove or "repair" these:
- **Fortune, CNBC** — 403 to a bare `curl` (bot-blocking). Cells link to reachable
  equivalents: the syndicated Insurance Journal copy, and SELC's own page.
- **`ai.google.dev/gemini-api/docs/*`** — returns a 302 chain into Google's
  silent-signin probe (`prompt=none&auto_signin=True`) that loops for a cookieless
  client and ends in `error=interaction_required`. **The pages are live and load
  normally in a browser.** Verified by reading their content directly.
- **Perplexity, x.ai** — 403 to WebFetch but fine to `curl` with a normal
  User-Agent. Reach for `curl -A "<browser UA>"` before concluding a page is gone.

**Link-check rule: a non-200 from `curl` is a hypothesis, not a finding.** Confirm
by loading the page before changing a cell.

## E1e. The pricing axis (added 2026-08-25)

**Where it lives:** top-level `pricing` key in `transparency-index.json` — NOT
`_meta.detail`, which is the environmental matrix. The section auto-hides if the
key is missing.

**What rots here, in order of speed:**

1. **`allowance` — fastest-moving thing on the page.** It is 🔴 × 8 today because
   26 of 27 plans publish nothing. That count comes from `plan-limits.json`, so
   **re-count it whenever that file is verified** rather than trusting the prose.
   The trend is one-directional and hostile: OpenAI *deleted* its only general cap
   between two checks. A 🔴 here is not safe to assume permanent in either
   direction.
2. **`rate_card`** — tracks `prices.json`. Four providers moved prices in the 22
   days before 2026-08-24. If `check-prices.js` fires, this column may need a look.
3. **`context_window`** — OpenAI is currently alone. If a second provider adds it,
   that is a real story, not a footnote.
4. **`price_change` / `model_retirement`** — slowest. These are contract terms and
   docs pages; annual is fine.

**Backlog cleared 2026-08-25 — all eight providers read from primary sources.**
No cell on this axis rests on a secondary source. One ⚪ remains **by design**:
Microsoft's API rate card, ungraded because Copilot is sold as a subscription with
no per-token price to publish. That is a business-model difference, not a
disclosure failure, and it should stay ⚪ rather than being "completed" to 🔴.

**The rule that produced the good outcome here: do not turn a cell 🔴 on a failed
web search.** Every ⚪ on this axis was resolved by reading the provider's own
terms, and two of them came back GREEN — grading on the search would have been
wrong in both directions.

**Verified 2026-08-25 on primary documents (quote-level):**
- OpenAI consumer ToU — "at least 30 days' notice … take effect on your next renewal so that you can cancel"
- OpenAI Services Agreement (business/dev only) — "Price changes on the Pricing Page will be effective fourteen days after they are posted"
- Anthropic Commercial Terms — "the earlier of 30 days after the updates are posted … or Customer otherwise receives Notice"; explicitly **not** consumer
- Anthropic Consumer Terms — 30 days, no change during a current term, increase applies at renewal
- OpenAI deprecations — ≥6 months GA, ≥3 months specialized variants
- Anthropic deprecations — ≥60 days, plus forward "not sooner than" dates for every active model
- Google deprecations — **no quantified commitment**; "earliest possible dates" only

**Four counter-findings are load-bearing — do not quietly drop them.** They are why
the axis is credible rather than a thesis in search of evidence:
1. Consumers get *more* price-change notice than developers — 30 days vs 14 at OpenAI.
2. **Price-change notice is the industry's most standardised disclosure.** Five of
   eight land on exactly **30 days** with a cancel-before-renewal right; Microsoft
   commits 15. Only Perplexity ("reasonable notice") and DeepSeek lack a number.
3. **Mistral, the smallest provider here, has among the best disclosure** — a
   lifecycle policy quantified per stage (GA 6 months) that equals OpenAI's.
4. **xAI is 🔴 on all six environmental dimensions and 🟢 on price-change notice.**
   The clearest proof in the repo that the axes are independent and must never be
   averaged into one "transparency score".

**Also verified directly, 2026-08-25:** Google One "at least 30 days' prior notice
of a price increase", plus a remedy clause for when it misses; xAI "30 days' notice
… applies at your next renewal"; Mistral 30 days in both ROW and EU consumer terms;
Microsoft Services Agreement §9.j 15 days; Perplexity only "reasonable notice";
Mistral lifecycle GA 6 months; xAI retirement pages carry redirect targets AND
billing impact; DeepSeek gave 3 months on its legacy model names; Perplexity and
Microsoft publish no model-lifecycle policy at all.

## E1f. The data-practices axis (added 2026-08-25)

**Where it lives:** top-level `data_practices` key. Rendered by the shared
`renderAxisMatrix(block, prefix)` — the same function that drives pricing.

⚠️ **It has a second reader since 2026-08-25: the Subscription Auditor.** Answering
"privacy" to *what matters most* renders this provider's `training_default` and
`optout` grades straight into the recommendation. Two consequences. **(1) The join
is by COMPANY DISPLAY NAME** — `data_practices.rows[].provider` has no `p` key,
unlike every other file here — so `audit.html` carries an explicit `PRACTICE_ROW`
map and `check-auditor.js` asserts both directions resolve. Renaming a row here
orphans the Auditor's privacy answer. **(2) The grades are now consumer-facing
advice, not just a table**, so this axis rotting has a second cost: the wording
must keep saying it grades *disclosure*, never conduct.

**This axis rots faster than the other two.** Defaults change with a policy update
that nobody announces: Anthropic moved consumer chats into training with an opt-out
during 2025. **Re-read the actual policies; do not trust these grades on sight.**

**Scope rule that decides most grades:** we grade the **consumer-facing** documents
— the privacy policy a normal user reaches, plus each provider's own data-use FAQ
where one exists. A practice disclosed only in an enterprise contract or a
developer changelog does **not** count as telling the consumer.

**A 🔴 on human review means the policy does not disclose it**, not that no human
review happens. We cannot observe the practice; we can observe the silence.

**Verified 2026-08-25, quote-level, on each provider's own pages:**
- OpenAI — consumer ChatGPT "improves by further training on the conversations people have with it, unless you opt out"; business "by default, we do not train on any inputs or outputs"
- Anthropic — "unless you opt out through your account settings"; deleted chats gone from back-end within **30 days**; training data kept de-identified **up to 5 years**; Commercial Terms: "Anthropic may not train models on Customer Content from Services"
- Google — human reviewers disclosed, and disclosed to continue **with Activity off**; auto-delete default **18 months** (3/36/indefinite options); feedback **3 years**
- Mistral — "your Input and Output, subject to your opt-out"; commercial processing "excludes model training"
- Microsoft — "in some markets, this data can help train our AI models … unless you opt out"; prompts used "including relevant advertising"; retention "can vary significantly" with no number
- DeepSeek — opt-out right asserted, default never stated, retention entirely qualitative
- xAI — **neither the privacy policy nor the consumer FAQ states the training default**; deletion within **30 days** is published
- Perplexity — "improve or create services and products, including our AI models"; precise only where it reassures ("we do not use the content of emails to … train")

**Three ⚪ cells, and they are honest gaps, not findings.** OpenAI retention (not in
the two documents read; a separate help article may carry it) and Perplexity
opt-out + retention (its data-use FAQ would not render). **Do not convert these to
🔴** — same rule that paid off on the pricing axis, where two ⚪ cells came back
green once the real terms were read.

## E2. `datacenters.json`

**Goes stale fast** — campuses get announced, capacity comes online, and grades
change when a watchdog or a utility publishes something the company won't.

**Per site:** `power_mw`, `power_mw_planned`, `water_grade`, `water_note`,
`sources[]`, `as_of`. Currently 12 sites across 7 providers.

> **FULL PASS 2026-08-25: all 12 sites re-verified, backlog cleared.**
> `last_updated` moved off 2026-07-13 for the first time, because the file-level
> claim is finally earned. Every `as_of` now reads `2026-08`. Rationale is in
> `_meta.verification_status` (renamed from `partial_verification`, which was
> spent). **No provider badge moved** — the two changes that could have move
> nothing on their own and are flagged below.
>
> **Microsoft's per-location table does NOT reach either Fairwater site.** Table 15
> covers Microsoft-**owned** datacenters under its own operational control for
> **FY25, ended 2025-06-30**. Fairwater Atlanta is QTS-leased *and* was not
> operational in FY25; there is no Mount Pleasant row at all.

### The two flagged grading calls — decide these deliberately or leave them

Both are genuinely ambiguous, both were left at the grade they already had, and
neither should be flipped as a side effect of some other change.

1. **`google-the-dalles` — partial, but arguably transparent now.** Google's 2026
   report publishes it in the same table and format as Council Bluffs (654.3 Mgal
   withdrawn / 185.3 discharged / 469.0 consumed, 2025). By the stated rule —
   *transparent means the company discloses it itself* — that is transparent. It is
   held **partial** to preserve the lede's other promise, *"who had to surface it"*:
   here, a newspaper and a lawsuit. **Grading it transparent erases the litigation
   history; grading it partial treats an identical disclosure differently from
   Council Bluffs.** No MW is published, so the choice does not move any badge.

2. **`aws-anthropic-new-carlisle` — partial, but arguably opaque.** There is **no
   operational water figure from anyone**; Indiana does not require reporting. By the
   Fairwater-Atlanta rule (*closed-loop site with no published number is opaque*)
   this is opaque. By the Abilene precedent (*a one-time initial-fill figure was
   enough for partial*) the county's 31M gal/day construction dewatering permit
   supports partial. **This one has teeth: at 1,100 MW, flipping it takes
   Amazon/Anthropic from 🟡 to 🔴** — the weighted score goes 2.00 → ~1.24.

**Site notes are PUBLIC copy.** They render on the page inside "show the math".
Write them for a reader: no maintainer instructions, no names, no "don't change
this". Maintainer guidance goes in `_meta.verification_status` (which does *not*
render) or here. A note shipped in the Microsoft PR saying "Do not flip this grade"
went live before this was caught — grep the notes before merging.

**Rules:**
- A few `power_mw` values are third-party estimates. **Don't move a badge on an estimate.**
- Early-stage campuses with no meaningful operating capacity are tracked but carry no capacity weight until they're running.
- Colocation landlords (Equinix, NTT, CyrusOne) aren't scored — they publish fleet-wide efficiency rather than per-AI-site figures, and need their own treatment. Adding them is a decision, not a gap to fill.
- Grades roll up **capacity-weighted**, so adding a large opaque site moves a provider's grade. Expect that, and re-read the provider row afterwards.

## E3. Hardcoded coverage counts

Adding or removing a site means editing prose in at least two places:
- `transparency-index.json` → `_meta.caveats` — "12 sites across 7 providers"
- `PROJECT-CONTEXT.md` §7 — "**12 sites / 7 providers**" plus the per-provider grade list

Same trap elsewhere: "5 of the 8 providers" (Auditor coverage), "26 plans", "all
56,250 answer combinations". Grep for digits in prose after any structural change.

## E4. The two scales are deliberate

The page grades **public knowability** on a 4-state scale and nests the older
**disclosure matrix** beneath it. They are different questions and they will
disagree. **Don't "reconcile" xAI's 🟡-vs-🔴** — it's documented in
`_meta.detail.note`.

---

# F. Water intensity

## F1. `extension/water.json`

**Two dates now, and the split matters.** Until 2026-08-24 this file had one
`_last_updated`, which moved every time a tier was added for a new model — so
routine model additions made the ml-per-token estimates look freshly verified when
they hadn't been re-read since Dec 2025. Now:

- **`_last_updated`** — when the file last changed (usually a new model's tier).
- **`_tiers_last_sourced`** — when the intensity figures were last checked against primary research. Currently `2025-12`.

The anchors remain Google's 0.26 ml per median Gemini text prompt (Aug 2025) and
Altman's 0.32 ml per ChatGPT query (Jun 2025). **No provider has published a newer
per-token figure**, and a 2026 peer-reviewed comparison found none reports an
AI-specific water metric at all — so "not disclosed" is still the finding here.

**The silent failure:** a model priced in `prices.json` with no `water.json` tier
renders **no water figure at all**, with no error. That gap had accumulated across
nine models before it was caught.

**Tiers:** `large` / `medium` / `small` / `tiny`, each with a conservative and an
academic ml-per-token figure. Adding an untracked model means **choosing** a tier —
that's a judgement about the model's size, and it's part of why some models are
deliberately untracked (A3).

**Goes stale when:** a provider publishes real per-token water data (nobody has
yet), or the underlying academic estimates are revised. Check `_sources` and
`_methodology` still describe what the numbers actually are.

**Guard:** `check-prices.js` — "priced, no water tier" is its first check.

---

# G. Extension mechanics

## G1. Platform DOM selectors — the biggest unguarded risk

**`extension/content.js` → `PLATFORMS`**, 11 hosts, each with CSS selectors for
user and assistant messages.

**Nothing tests these.** When a platform ships a redesign the selectors stop
matching and EcoMeter silently counts nothing — no error, no zero, just a panel
that stops moving. No script can catch this; it needs a human or a browser.

| Host | Anchored on |
|---|---|
| claude.ai | `[data-testid="user-message"]`, `.prose`, plus a special scraper |
| chatgpt.com / chat.openai.com | `[data-message-author-role]` |
| gemini.google.com | `user-query` / `model-response` custom elements |
| grok.com | plus an `x.com` path guard and programmatic injection |
| chat.mistral.ai · perplexity.ai · copilot.microsoft.com · poe.com · chat.deepseek.com | per-platform selectors |

**Check:** open each platform, send a message, confirm the side panel's count
moves. `.prose` and the Gemini custom elements are the most fragile — a generic
class name and framework-specific tags respectively.

> **Not checked on the 2026-08-24 pass — needs Rory.** Verifying these requires
> being logged in to eleven consumer AI products and sending a real message in
> each. No script can substitute, and no agent can do it without your sessions.
> **This is the single largest unguarded risk in the repo**: the failure is
> silent, and the extension shows a panel that has simply stopped counting.

## G2. Host permissions

`extension/manifest.json` → `host_permissions` + `content_scripts[].matches` must
stay in step with `PLATFORMS` and with reality (domain moves, new platforms).

**Adding a host is not free:** it triggers store permission re-review and a
user-facing permission notice on update. The pending build already adds
`generativelanguage.googleapis.com` for the opt-in Gemini token count, so expect
that regardless.

**Knock-on:** any change here changes `STORE-SUBMISSION.md` (per-permission
justifications), `STORE-LISTING.md` (the platform list — see H1), and possibly
`privacy-policy.html`.

## G3. Tokenizer accuracy bands

`extension/sidepanel.js` → `METHOD_ACCURACY`. These are user-facing claims about
how wrong we might be, so an optimistic band is a transparency failure, not a
rounding issue.

| Method | Band | State |
|---|---|---|
| `api-visible`, `exact-local`, `tiktoken-exact` | 0% | exact |
| `estimated` | ±11% | **measured** by `calibrate-tokenizer.js` |
| `tiktoken-approx`, `sp-estimated` | ±10% | **unmeasured guesses** — don't quote as measured |

**A "±8%" claim sat in a comment for months and was false** — measured 12.9% MAE
with a −9.4% systematic undercount.

**Re-measure when a provider changes tokenizer.** Anthropic already has: Claude 4.7
and later produce ~30% more tokens for the same text than 4.6 and earlier, so
identical text is *not* an identical token count across generations, let alone
across providers. Any cross-model comparison built on a fixed token count
understates those models by roughly a third.

**Guard:** `calibrate-tokenizer.js` — fails if the UI band is optimistic.

**Open:** validating the two guessed bands needs the relevant tokenizers bundled.

## G4. Bundled tokenizers

`tokenizer_cl100k.js` / `tokenizer_o200k.js` (tiktoken, lazy-loaded),
`tokenizer_hf.js` (exact-local byte-BPE, self-verifying — DeepSeek), and the
`tokenizers/` assets staged by `fetch-tokenizers.js` at publish time.

**Goes stale when** a provider ships a new encoding. Symptom: a model routes to the
wrong encoder and its error band is silently wrong. (GPT-5 routing to the wrong
encoding was a real bug.) Re-check the model→encoding map after any A3 change.

## G5. Extension version

Three numbers that should agree: `extension/manifest.json` → `version` ·
`extension/prices.json` → `_meta.version` · what's actually in the store.

**Reactive versioning:** `publish.yml` bumps only when the store rejects the
current version as a duplicate, so manual bumps are respected and never
double-bumped. Don't pre-emptively bump.

---

# H. Store listing and policy

## H1. `extension/STORE-LISTING.md`

**Standing rule, at the top of the file:** name supported platforms **at most once,
in prose, and never in the short description.** v6.12 was rejected 2026-07-29 under
*Spam and Placement in the Store* (ref **Yellow Argon**) for "excessive keywords",
quoting the nine-platform list. Code and permissions were never at issue.

**Goes stale when** G2 changes the platform list, or when the copy is edited. The
current description points at a screenshot ("The screenshots below show the full
list of supported platforms") — **if that screenshot isn't uploaded, that's its own
metadata problem, arguably worse than the original rejection.**

## H2. `extension/STORE-SUBMISSION.md`

Paste-ready answers: single purpose, per-permission justifications, the remote-code
answer, the data-usage disclosure (submitted as **"Website content" only**, with
reasoning in its §3), and the explanation that the Auditor export is a local file
save, not an upload.

**Must match the current manifest exactly.** A permission in the manifest with no
justification here is a rejection.

## H3. `extension/privacy-policy.html`

**Effective date: July 27, 2026.**

Must describe the actual data flows, which today are: nothing leaves the device
except the two **opt-in, off-by-default, key-gated** provider token-count calls
(Anthropic for Claude, Google for Gemini), sending only the user's own message
text to that provider's token-count endpoint.

**Redeploy the hosted policy in the same release as the zip** — the store checks
the URL resolves and that the policy matches the permissions requested.

If G2 or the token-count behaviour changes, this file and its effective date
change with it.

## H4. The shipped build vs `main`

**This is a freshness item because what users have is not what this repo says.**

**Closed 2026-08-24: v6.13 uploaded**, built from `main` at `35359ec` and verified
before upload (22 entries, manifest at root, no backslash separators, fonts and
icons present, version confirmed inside the zip). It is the first build carrying
the corrected cost model. **Awaiting review** — watch for a repeat of the Yellow
Argon listing rejection, and expect permission re-review for
`generativelanguage.googleapis.com` regardless.

For the record, the store had been serving a pre-2026-08-02 build with billed
input charged ~2×, Claude image tokens ~51×, a false "±8%" band, stale prices, no
GPT-5.6 family, and export v1.

> ⚠️ **A shipped build freezes its prices, so this entry does not stay closed.**
> The extension reads `chrome.runtime.getURL('prices.json')` — the bundled copy —
> and never fetches remotely. Whatever shipped is what users see until the next
> upload. **`gemini-3.6-flash` and `gemini-3.7-flash` are on a promotional rate
> until 2026-12-31** (A6); if 6.13 is still live in January it understates Gemini
> cost by 2×, which is the harmful direction. `check-prices.js` catches this in the
> repo and cannot catch it in the store. **The real fix is exercising the weekly
> `publish.yml` cadence rather than shipping once every few months.**

**Every pass should re-ask:** what's the store status (dashboard → the item →
status + version), and has the fix gone up?

**Local state:** `manifest.json` and `prices.json._meta.version` agree at **6.13**
(`check-prices.js` enforces the match — bump both or neither).

**What a future pass should ask here**, in order:

| Question | Why it matters |
|---|---|
| Did 6.13 clear review? | If rejected on listing copy again, the fixed text is already in `STORE-LISTING.md` — don't recompose it. |
| Is it *submitted*, or a saved draft? | A draft sits in the dashboard forever and never reaches review. |
| How old are the shipped prices? | They're frozen at build time. Compare the live build's version against `prices.json._meta.last_updated`. |

Also worth asking after any submission: did it use the **old** description? If
pasted from the dashboard's existing text rather than `STORE-LISTING.md`, it
carries the nine-platform list and another Yellow Argon rejection is near-certain
regardless of code.

**Windows build traps are in `PROJECT-CONTEXT.md` §11** — there are two, and the
dangerous one *uploads successfully* and just ships broken icons and fonts. The
verified 6.13 build checked: 22 entries, manifest at root, no backslash
separators, `fonts/` (5) and `icons/` (4) present, store docs excluded, and the
version read back from *inside* the zip. Repeat all five next time.

---

# I. Copy and docs

## I1. `PROJECT-CONTEXT.md`

§0 is titled "as of `<date>`" and carries ship status, the last three sessions'
work, and 13 numbered open threads. **It is the file most likely to describe a
state that no longer exists.** Every pass: update §0's date, correct the ship
status, and close or re-rank the open threads.

## I2. `README.md`

Known stale and extension-focused. Doesn't describe the website, the four site
tools, or the guard scripts.

## I3. Comments that describe the code wrongly

Rule 4 applies to code as much as data.

**Worked example, fixed 2026-08-24:** `pricing.html`'s header comment said
*"Subscription prices are NOT in prices.json, so the SUBSCRIPTIONS array below is
still maintained by hand. Verified June 2026"* — while the fetch handler further
down assigns `SUBSCRIPTIONS = data.subscriptions` from `prices.json`. Two facts out
of date, and the kind of thing that sends the next person editing the wrong file.
Now corrected, with a line recording what it used to claim.

The 2× billed-input and 51× image-token bugs both sat in **well-commented functions
whose comments confidently described the wrong behaviour.** Treat a confident
comment as a claim to check, not as documentation.

## I4. `index.html`

Tool cards, claims, and the EcoMeter store link. Check the store link resolves, and
that each card's copy still matches what the tool does — the Auditor gained student
routes and a break-even figure since those cards were written.

## I5. Google Fonts

Site pages load fonts from `fonts.googleapis.com`. **This is the one privacy wart**,
and it's an open item to fix, not a precedent to extend. `pricing.html` already has
commented-out self-hosted `@font-face` blocks and the extension already ships its
own fonts in `extension/fonts/` — the pattern exists, it just hasn't been applied
site-wide. Don't add a second remote asset.

---

# J. Repo hygiene

## J1. Stale branches

**Cleared 2026-08-26: 25 remote and 24 local branches deleted, all verified merged
first.** The repo went from 27 remote branches to 2. Two survive, and they are the
only part of this entry worth reading again.

**Don't keep a list here — the list is what rots.** The 2026-08-24 pass named "16
branches provably merged"; two days later it was 25, because every merged PR adds
one. Run the check instead:

```bash
git branch --merged main                          # LOCAL only
git rev-list --count origin/main..origin/<branch> # REMOTE — 0 means merged
```

⚠️ **`git branch --merged` does not see remote branches**, which is how the remote
list grew to 27 while the local check looked clean. Check both, and prefer
`git branch -d` (it refuses to delete anything unmerged) over `-D`.

⚠️ **A zero-commit diff is not the same as zero commits.** `feat/pricing-axis`
carried one commit not in `main` — a merge commit whose three-dot diff
(`git diff main...branch`) was empty. Content already in main, topology not. Safe
to delete, but only because the diff was checked, not the count.

**The two that are NOT merged, and must not be deleted blind:**

| Branch | Unmerged | What's on it |
|---|---|---|
| `feat/subscription-auditor` (remote + local) | 3 commits | "Add Meta Muse Spark 1.1 across pricing, auditor, and the model picker" · "Add the GPT-5.6 family (Sol / Terra / Luna)…" · "Improve Auditor cost logic…" |
| `docs/project-context-2026-07` (local only) | 1 commit | "docs: refresh PROJECT-CONTEXT for the Transparency Index + validate-site" (+100/−55) |

**The open question is Meta Muse Spark 1.1.** The GPT-5.6 family and the cost-logic
work both reached `main` by other routes, so those two commits are redundant. Muse
Spark did not: **it appears nowhere in `prices.json`, `audit.html` or the extension
picker.** Either it was dropped deliberately or a provider addition got stranded on
a branch — this file cannot tell which, and the answer decides whether the branch is
deletable or a to-do. **Decide it, then delete the branch either way.**
`docs/project-context-2026-07` is very probably superseded (PROJECT-CONTEXT has been
rewritten several times since July) but it is unmerged, so the same rule applies:
read it, then delete it.

**Restoring a deleted branch** is trivial while the commit is still reachable —
`git push origin <sha>:refs/heads/<name>`. For everything deleted on this pass there
is nothing to recover: all of it is in `main`.

## J2. Committed build artifacts

`ecometer-ai-v6.13.zip` sits at the repo root (1.7 MB) — the build uploaded on 2026-08-24. The stale v6.12 artifact was deleted the same day, because two similarly-named zips in the upload dialog is how the wrong one gets shipped. `.gitignore` has `*.zip` and
`git ls-files` shows nothing tracked, so it's an untracked local leftover — safe to
delete locally. Just don't commit one.

---

# Verification suite — run all seven, last

```bash
node scripts/check-prices.js && node scripts/check-auditor.js && node scripts/test-auditor.js && node scripts/check-clock.js && node scripts/test-cost-model.js && node scripts/calibrate-tokenizer.js && node scripts/validate-site.js
```

| Script | Covers | Doesn't cover |
|---|---|---|
| `check-prices.js` | 5 files agree on every price; water-tier parity; displayed-but-unpriced models | **Never opens `audit.html`** |
| `check-auditor.js` | `audit.html` + `pricing.html`'s `FALLBACK_LIMITS`, against `prices.json` / `plan-limits.json` / `student-access.json` / `transparency-index.json`; plus (2026-08-25) every paid tier being selectable, feature labels, the practices join, the frontier examples, no hand-typed dates in the student copy, expired `claim_by`, and the extension button names | `pricing.html` prices — that's `check-prices.js` |
| `test-auditor.js` | Sweeps all 56,250 answer combinations + the EcoMeter import | Whether the underlying data is *true* |
| `check-clock.js` | Clock fallback parity; capex/energy levels vs published totals; one-company share bound; hardcoded anchor date | Counters with no authoritative total — by design, not omission |
| `test-cost-model.js` | 44 assertions: billed input, image tokens, long-context tiers, export v2 | — |
| `calibrate-tokenizer.js` | Measures the estimator; fails if the UI band is optimistic | The two guessed bands (G3) |
| `validate-site.js` | HTML/JSON well-formedness, page references | **Plausibility of any number** |

**In CI** (`validate-site.yml`, on PRs into `main` and pushes to `main`):
`validate-site.js`, `check-auditor.js`, `test-auditor.js`, `check-clock.js`. The
other three are manual — running them is part of a freshness pass.

**Data checks and behaviour checks catch different things.** `check-auditor.js`
would never have found the downgrade bug that told 450 of 56,250 answer
combinations to drop to a free tier that throttles image generation — every file
was internally consistent. Sweeping the answer space found it in seconds. When a
change touches what the engine *decides* rather than what the data *says*,
`test-auditor.js` is the one that matters.

---

# What a pass should report

Per entry, one line: **current** / **fixed (what changed)** / **needs Rory (why)**.

"Needs Rory" is the right answer for anything requiring a login (Google's student
page), a browser (G1 selectors), the store dashboard (H4), an EcoMeter export (B3),
or a scope judgement (B4, E2 colo landlords). Don't guess past a blocker — flag it
and finish everything else.

End with: the seven scripts' output, and a one-line update to the **Last full pass**
date at the top of this file.
