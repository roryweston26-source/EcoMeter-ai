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

_**2026-08-28 — not a full pass; one targeted job: F re-sourced.** `water.json`'s
`_tiers_last_sourced` had read `2025-12` for nine months while every other dataset
sat at days old. **Re-checked against primary sources: the anchors have not moved.**
Google's paper (arXiv:2508.15734) is still v1 and never revised, its 2026
Environmental Report repeats the same May-2025 per-prompt figures (matching what
`transparency-index.json` recorded on 2026-08-25 from a direct read), Anthropic
still discloses nothing, and no provider publishes water per *token* at all. So the
stale date was bookkeeping, not evidence — `_tiers_last_sourced` is now `2026-08`,
honestly earned. **But the pass found six errors in how the file described its own
numbers**, listed in F1: a scope label that overstated what Google measures, a
halved academic range, a 33× energy figure passed off as a water figure, an
unsourceable "10–25×", an unreproducible academic derivation, and a data-centre
cooling vendor's marketing blog sitting in `_sources` as our newest evidence. Two
of these were also live in the extension's user-facing disclaimer and are fixed
there. **No tier value changed** — all 68 preserved. **New: `_open_questions`** in
`water.json`, two items needing Rory — **and then researched in a second pass the same day (F1a): there is real evidence on both.** Li et al.’s own request definition is ~1,300 tokens not 500; OpenRouter’s 100T-token study puts real prompt+completion at >5,400; and Jegham et al. — which we were already citing without using — benchmarks 30 models at known token counts and shows the constant-ml-per-token model is **structurally** wrong, roughly right at short queries and 4–15× over at long ones. The ~40× full-scope multiplier is also outside the evidence range (real: 5× Google, 14× Azure, 26× AWS). **Then Rory chose option 2 and it shipped the same day (F1b): water is now a function of query size**, fitted to that benchmark by the new `scripts/derive-water-model.js`, with the flat ml-per-token constants deleted. Cross-checks against Google at 0.86x without being tuned to it; the full-scope multiplier lands at 14–25x, inside what real infrastructure implies, where the old value was 38x. Water and cost now make deliberately OPPOSITE caching assumptions — billing re-charges history, compute does not re-spend it. One live finding left open: the fitted tiers are **not monotonic** (`small` above `medium`), which undercuts size-based tiering and is shipped rather than smoothed. **A third pass then rebuilt it again (F1c): water is now energy × infrastructure**, because the inversion was the model telling us size was doing two jobs. Every published per-prompt figure now either feeds the model or tests it — Google’s 0.26 mL anchors Gemini’s energy curve (it had been 2.3× over on a cross-vendor average), Jegham’s 30 models fit the energy curves, and Li et al., Altman and **Mistral’s peer-reviewed LCA** validate. Host water rates now come from **our own directly-read 2025 figures**, not the paper’s 2022–23 ones (AWS WUE 0.12, not 0.18). Two methodology corrections against primary definitions: WUE applies to IT energy with no PUE multiplier, and off-site water carries PUE — Jegham has both backwards. Ten water guards, **10/10 verified by fault injection**. **All seven scripts pass.**_

_**2026-08-29 — not a full pass; one targeted job: F's presentation, plus three
outside-feedback fixes.** The water model itself is unchanged (F1c stands); what
changed is that it no longer **presents** as certain. The panel used to render
`'💧 ~' + fmtWater(...)` at `toFixed(2)` — two decimal places on a figure our own
disclaimer says swings **5×–50× by scope and 7–10× by host**. Verified against
`water.json` `_hosts`: the real scope spread is 5.1× (Google) to 49.5× (AWS), so
the disclaimer was right and the display was not. **Both endpoints are now shown
as a range at two significant figures** (`0.39–19 ml`), the Conservative /
Full-scope toggle is deleted (it existed only to pick which single number to
over-state), and `fmtWaterRange()` holds one unit across the range so the ends stay
comparable. Checked across all 68 models in `water.json` and every magnitude from
µl to L. **Six new guards in `test-water-model.js`, each verified by injecting its
fault** — they pin the *presentation*, not the model: the range must not collapse to
one number, the unit must come off the top end, neither end may exceed two
significant figures, and neither `waterScope` nor two-decimal ml formatting may
return. Its `W()` helper still takes a scope, because the scopes are now the ends of
the range rather than a thing the reader picks. This closes the gap between what CLAUDE.md requires — never present
modelled figures as measured — and what the extension actually did.
**Two more from the same feedback.** (1) The Auditor could tell a reader the API
was cheaper while only sometimes saying what they gave up; the trade-off is now
one shared `API_TRADEOFF` constant naming projects, connectors and the API's own
rate limits, and `pricing.html`'s break-even note says outright that a plan
pricing out at $4 of tokens can still be worth $20. **Note:** the second
`API_TRADEOFF` call site is defensive only — 36 probed profiles never reached it,
because whenever plain API beats the fit tier the hybrid branch has already
claimed the recommendation. (2) The replay label stated the mechanism but hid its
shape; it now shows the measured multiple and that it climbs (`×3.4 that, rising
with every turn`) — ×1.0 at turn 1 to **×62 at turn 50** on a 400/600-token
synthetic chat. That growth is the one thing DOM-level tracking can see that
almost nobody reports. **Homepage reordered** so the Transparency Index sits in
the top three; both "Coming soon" cards moved to the end, since nothing that
exists should rank below something that does not._

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
| **2026-09-27** | **Perplexity's Sonar chat API stops being supported** — superseded by its Agent API. All three Sonar rates in `prices.json` expire with it. Perplexity break-even no longer depends on them (see A3), but the rates are still shown in the model table. | [A1](#a1-per-token-api-prices) |
| 2026-10-01 | `roll-clock.yml` fires (09:00 UTC, quarterly). Opens a mechanical PR that is **not** a re-anchor. | [D1](#d1-clockjson-anchor-levels-and-rates) |
| Every Monday | `publish.yml` fires (09:15 UTC) — refreshes prices, builds, uploads a CWS draft. | [A1](#a1-per-token-api-prices), [G5](#g5-extension-version) |
| June 2027 | ChatGPT for Teachers free window ends (US K-12). | [C2](#c2-known-dated-offers) |
| Daily, by clock | **DeepSeek meters peak/off-peak by UTC time** — the only provider here that does. We store peak rates deliberately. | [A5](#a5-dated-price-events) |
| ~~2026-08-31~~ | ~~Sonnet 5 intro rate ends~~ — **resolved 2026-08-24.** Anthropic made $2/$10 permanent; the rise to $3/$15 will not occur. | [A5](#a5-dated-price-events) |
| ~~No date~~ | ~~DeepSeek's warned price rise~~ — **landed 2026-08-24**, ~3× input / ~4.5× output. | [A5](#a5-dated-price-events) |
| ~~No date~~ | ~~Mistral "Vibe" rename~~ — **confirmed 2026-08-24.** Product is branded Vibe; the `Le Chat Pro` plan key is kept as the cross-file join. | [A2](#a2-consumer-subscription-prices) |
| ~~Blocking~~ | ~~Store build materially wrong, fix unshipped~~ — **v6.13 uploaded 2026-08-24**, **v6.14 on 2026-08-28**. Top item since 2026-08-02. | [H4](#h4-the-shipped-build-vs-main) |

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

**Source of truth:** `extension/prices.json` → `api` (10 providers, ~76 models).

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

Added 2026-08-29, and two of the three need care:
alibabacloud.com/help/en/model-studio/model-pricing — **JS-rendered; a plain fetch
returns a shell with no prices at all.** Render it. Also tiers by input-token count
(same semantics as `long`) and prices the same model differently by region — the
stored figures are the **International** tier ·
docs.z.ai/guides/overview/pricing — reads fine with curl ·
platform.moonshot.ai/docs/pricing/chat-k3 — **append `.md`** for a clean Markdown
copy. Guessing these paths returns a byte-identical SPA fallback that looks like a
successful fetch, so follow the real links from the pricing index

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

**The 2026-08-29 Chinese-lab addition touched only the first three**, deliberately.
The eight Alibaba / Z.ai / Moonshot models are priced, watered and shown on
`pricing.html`, and appear **nowhere else** — not in the extension picker, not in
`audit.html`, not in `plan-limits.json`. **One exception added 2026-08-30:**
`glm-5.3-flash` is now in `free_tiers` too (see A4). The other seven are unchanged. That is a coherent
state, not an oversight: `check-prices.js` §5 requires picker models to be priced,
not the reverse, and no subscription plans were added so no `plan-limits` rows were
needed. **Adding any of these models to the picker or the Auditor means doing the
other four files at the same time.**

**Checked all four unaudited providers on 2026-08-26** — the ones guard 9d cannot see,
because they have no tier model list. Two were wrong, both now fixed and re-dated:

- **xAI**: `x.ai/pricing` publishes one model row, **Grok 4.6**, across the consumer
  plans. We were pairing it with `grok-4.3`, which appears nowhere on that page, so
  every SuperGrok tier now shows a single figure instead of an invented range.
- **Perplexity**: its help centre (updated 2026-07-29) publishes a per-plan model
  table, and the plans are almost all **third-party frontier models** — Pro serves
  GPT-5.6 Terra, Gemini 3.1 Pro, Claude Sonnet 5 and Grok 4.5; Max adds GPT-5.6 Sol
  and Claude Opus 5. We were pricing both against Perplexity’s own Sonar rates.
  `value_models` now accepts a **`provider:model`** form for exactly this case.
  **Sonar is deliberately excluded**: the app model is branded Sonar 2 with no API
  rate published under that name, and the Sonar API adds a **per-request search fee**
  ($5/1,000) on top of tokens that this cost model does not carry — pricing it at
  token rates alone understates API cost, which pushes break-even **up** and makes
  the plan look harder to justify than it is. (First written the other way round;
  corrected 2026-08-26 along with the survey below.)
- **Mistral** ✅ confirmed on `mistral.ai/pricing`, which names Mistral Medium 3.5 and
  Mistral Small 4 as its latest models — exactly our pair.
- **DeepSeek** ✅ nothing to check: no paid consumer tier, so no break-even is computed.

**Guard added 2026-08-26** (`check-auditor.js` 9e): every `value_models` key in the
file, audited provider or not, must resolve to a priced rate — with the provider
prefix honoured. Verified by injecting both a bad model and a bad provider.

**The seventh place is the one that got missed, and it moved a published number.**
When `gemini-3.6-flash` / `3.7-flash` were added, `PLANS[].models` was updated and
`plan-limits.json` → `value_models` was not, so for weeks every Gemini break-even was
priced on `gemini-3.5-flash` and two Flash-Lites that no tier carries. Google AI Pro
read "break even at 48–64 messages a day" when on the models that plan actually serves
it is **48–137** — the error flattered the subscription, which is the harmful direction.
Both files were internally consistent and re-verified on different days, so only a join
could see it. **Guard added 2026-08-26** (`check-auditor.js` 9d): every `value_models`
entry for an audited provider must appear in that tier's `models` list. Verified by
injecting the fault. The four providers the Auditor does not audit have no tier model
list to join against — those stay a manual read.

**Retiring a model:** don't delete the key. Models no longer on a provider's
current page are retained at last-known rates because they stay selectable in the
picker — record them in `_meta.caveats._legacy_keys` and treat those numbers as
historical, not current.

**Deliberately untracked** — decide, don't default: `deepseek-v4-flash-vision-exp`
($0.44/$1.32 peak, seen on api-docs.deepseek.com 2026-08-27 — experimental vision
variant, not offered as a chat model, and adding it would mean inventing a
`water.json` tier for an image path we do not model), `grok-build-0.1` ($1/$2),
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

**Re-verified 2026-08-30 against the providers’ own pages — nothing had moved in six
days.** Recording the negative because a check that found nothing is still a check,
and the next pass should know these were looked at rather than assumed:
- **Google** ✅ `gemini.google/subscriptions` Free card still reads "Access to 3.6 Flash"
  and "Varying access to 3.1 Pro". Our pair is exact. Note 3.7 Flash is priced in
  the API but is **not** on the free app — do not promote it on the strength of the
  API list alone.
- **OpenAI** ✅ read from the compare grid’s per-cell labels, not the visual grid.
  Free column: Luna **Yes**, Thinking Mini **Yes**, Sol **No**, Sol Pro **No**,
  Legacy models **No**. Terra on Free is "Limited access in Work and Codex on
  desktop" — deliberately not listed as a free chat model, and the note says so.
- **xAI** ✅ every plan column including Free carries a tick on Grok 4.6 (checkmark
  path vs the dash path used for a "no"). Gates on rate limits, not model access.
- **Anthropic** — nothing to check against. `claude.com/pricing` publishes feature
  bullets per plan and **no model mapping at any consumer tier**, so our free line-up
  is unverifiable from Anthropic’s own surfaces. That is a not-disclosed finding, not
  a gap in our data. API rates on the page did confirm Sonnet 5 $2/$10 and Haiku 4.5
  $1/$5.

**Two things the same pass fixed, both in `free_tiers`:**
- **Copilot’s stand-in rate was being printed as Copilot’s rate.** `pricing.html`’s
  free-tier view showed "Copilot (model not disclosed)" beside **$5.00 / $30.00** —
  GPT-5.5’s rates, an inference of ours that Microsoft has never published. The
  subscriptions view already guarded this with `no_api_rate`; the free view had no
  such guard. `free_tiers.microsoft.models[0]` now carries **`no_api_rate: true`**
  and the view prints "not disclosed" across both rate cells. **If another provider
  is ever priced against a stand-in, set this flag in the same commit.**
- **Z.ai was missing from the free tier entirely.** `subscriptions` has carried
  `Z.ai (Free) $0` since 2026-08-29 with the model named in its note, and
  `plan-limits.json` has the row — but `free_tiers` did not, so the Free-tier view
  showed eight platforms while the Subscriptions view showed nine. Added
  `glm-5.3-flash`. **Not independently verified by us** — the model is inherited
  from the subscriptions note (chat.z.ai is login-walled), and the entry says so.
  Its rate is on a promo to **2026-09-09**; `check-prices.js` fails once that passes.

**Open, not fixed (2026-08-30):**
- **`pricing.html`’s `FALLBACK_LIMITS` snapshot has drifted from `plan-limits.json`.**
  The free rows are worst: Gemini (Free) still says `gemini-2.5-flash-lite` /
  `gemini-3.5-flash`, Grok (Free) still says `grok-3-mini` / `grok-3`, ChatGPT Free
  still tops out at `gpt-5.5`, and Z.ai is absent. Live data overwrites all of it on
  load, so this is only visible when the fetch fails — but nothing guards it, and
  it will keep rotting. **No guard exists for fallback-vs-live drift.**
- **The free-tier view has no fallback data at all.** `freeData` is built only from
  live `prices.json`; the other two views carry snapshots. A failed fetch used to
  render "No matches. Try a different search.", blaming the reader for a network
  error — it now says the data did not load. A snapshot would be an eighth copy of
  the free line-up, so this was left as an honest empty state on purpose.
- **x.ai now brands itself SpaceXAI.** Page title "Pricing: Compare Grok Plans |
  SpaceXAI", footer "© 2026 SpaceXAI LLC". We display the provider as "xAI" and the
  key `xai` is a cross-file join. Same shape as the Le Chat → Vibe rename: **decide
  whether the display name follows, and never move the key.**

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
price through **2026-12-31**, reverting to $1.50/$7.50 — and **`glm-5.3-flash`, half
price through 2026-09-09**, reverting to $0.15/$0.50.

⚠️ **GLM-5.3 Flash is the nearest expiry in the file and it moves a headline number.**
At its promotional $0.075 it is the cheapest input rate on the whole tracker, so the
"Cheapest input / 1M" ticker reads **$0.07**. On 2026-09-10 that ticker should read
$0.10 (Gemini 2.5 Flash-Lite / GPT-4.1 nano). `check-prices.js` fails on the date, but
the ticker is computed live from whatever the file says, so it will quietly show a
wrong headline in the window between the promo lapsing and someone running the check.
Z.ai states the end as **24:00 on 2026-09-09 UTC+8**, which is 16:00 UTC — the stored
date is the local one, so the guard trips a few hours late.

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

## A9. Open weights and the host spread (added 2026-08-29)

**Two new optional blocks on an `api` entry**, added with the three Chinese labs.
They rot faster than a price does, and neither is checkable against the provider's
own page the way `input`/`output` are.

```json
"open_weights": { "license": "apache-2.0", "osi": true, "params": "27B dense", "url": "https://huggingface.co/..." },
"hosted": { "n": 11, "low": {...}, "high": {...}, "cheaper_than_first_party": 7,
            "quant": ["fp8"], "checked": "2026-08-29", "source": "https://openrouter.ai/..." }
```

### The rule that produced these, and must survive

**Open weights is a property of a MODEL, not a provider.** Alibaba publishes weights
for `qwen3.8-2.4t-a95b` and `qwen3.8-27b` and *not* for the `qwen3.8-max` and
`qwen3.8-flash` tiers it sells beside them. Mistral publishes **only** Small — Medium
3.5, Large 3 and Codestral are all closed, which is the opposite of how Mistral is
usually described. Badging a provider would state a falsehood about specific models.
The page therefore drives the badge entirely off the presence of an `open_weights`
block, and that block is only written when the weights page has actually been loaded.

**Two independent sources agreed on the split** and should both be used again:
OpenRouter's `hugging_face_id` field (null for closed models), and Alibaba's own
pricing page, which carries a section headed *"Text generation - Qwen (open source)"* —
the lab drawing the line itself.

### `osi` is a second, weaker claim — don't collapse it

Only **6 of 11** badged models carry a standard OSI licence. The flagships mostly carry
bespoke licences *named after themselves* (`kimi-k3`, `glm-5.3`, `qwen3.8-max`), which
are not the same promise as MIT and may carry usage restrictions nobody has read. The
badge renders solid green for `osi: true` and dashed grey otherwise, and
`check-prices.js` fails if `osi` disagrees with the licence string in either direction.
**`deepseek-v3` is recorded as `"not stated in model-card metadata"`** — that is
literally what the HF API returned, and it is deliberately not a guess.

### What rots, and how fast

| Thing | Rots because | Re-read |
|---|---|---|
| `hosted.low/high/n` | hosts add, drop and reprice models constantly | `hosted.source` (OpenRouter endpoints API) |
| `cheaper_than_first_party` | same | recompute from the same fetch |
| `quant` | a host silently requantising changes what you're buying | same |
| `license` / `osi` | labs relicense between releases | the `url` |
| `params` | fixed per model — safe | — |

**Guard:** `check-prices.js` §8 — shape, `low ≤ high`, `n ≥ 2`,
`cheaper_than_first_party < n`, `hosted` without `open_weights`, `osi` disagreeing
with the licence, a missing/non-https `url`, a missing `source`, and **`checked`
older than 120 days fails loud**. All five destructive paths were validated by
breaking the data and watching them fire.

### The confound, which must stay in the copy

**Hosts serve at different numeric precisions** — int4, fp4, fp8, bf16, mxfp4 all
appear. A 4-bit quantisation is a lossy compression of the weights, so the cheapest
host is frequently *not running the same computation* as the dearest. The spread is
therefore partly a quality difference and only partly a margin difference, and most
hosts don't state precision on their own pricing pages. **The page says
"precision varies (…)" wherever `quant` has more than one value; don't quietly drop
that line to tidy the layout.** Where a host lists several SKUs for one model we take
the cheapest per host — otherwise Kimi K2.7 Code's "highspeed" SKU at double the rate
would masquerade as Moonshot charging two different prices for the same thing.

### The finding, as measured on 2026-08-29

Spreads were **1.18×–2.88×**, not the order-of-magnitude gaps this was expected to
show. The sharper result is *who* is expensive: **for 4 of 6 models the lab that made
the model is in the more expensive half of the market for it.** Z.ai is the single
dearest of 16 hosts for GLM-5.3. Moonshot is 12th of 15 for Kimi K2.7 Code, where nine
hosts undercut it and the cheapest is 31% below. **And Alibaba's published list price
for `qwen3.8-27b` ($0.50) is above all eleven hosts serving it — including Alibaba's
own resale at $0.425.** That last one broke the first version of the guard, which had
assumed the first-party rate must sit inside the host range; the guard now only catches
order-of-magnitude gaps, which is the real failure mode (a units error).

**This comparison only exists because the weights are public.** For a closed model
there is no second price. That is the argument for the column, and it's worth keeping
in the copy if it ever gets rewritten.

### The biggest spread in the file is DeepSeek's, and it lands on a price rise we already flagged

Measured 2026-08-29, after the three Chinese labs were already shipped:

| Model | first-party | cheapest host | spread | hosts cheaper than the lab |
|---|---|---|---|---|
| `deepseek-v4-flash` | $0.44 | **$0.068** (DigitalOcean) | **6.48×** | **16 of 17** |
| `deepseek-v4-pro` | $1.32 | $0.507 (Baidu) | 3.77× | 7 of 17 |
| `mistral-small-4` | $0.15 | $0.15 (Mistral) | 1.25× | 0 of 2 |

**DeepSeek raised its prices on 2026-08-24 and the open-weight market did not follow,
because the weights are MIT and it cannot be made to.** `_deepseek_increase_landed`
records the rise: v4-flash went $0.14/$0.28 → $0.44/$1.32. The same published model is
being served at **$0.068** — 6.5× below DeepSeek's own API. Cloudflare is the only host
at DeepSeek's list price, matching it exactly.

**It survives the off-peak objection, which is the first thing anyone will raise.**
Stored DeepSeek rates are PEAK and off-peak is exactly half (`_deepseek_peak_offpeak`).
At the off-peak $0.22, v4-flash is **still 16 of 17**. **v4-pro does NOT survive it**:
7 of 17 at peak but only **2 of 17** off-peak, where Baidu and StreamLake at ~$0.507
stay below DeepSeek's $0.66. Quote the flash number; qualify the pro one.

**The quantisation caveat is weaker here than anywhere else, and that is evidence-backed.**
DeepSeek's own released checkpoint carries `quantization_config.quant_method: "fp8"`
with `expert_dtype: "fp4"` (`config.json` on the HF repo, read 2026-08-29). So the fp8
and fp4 hosts are serving **the format DeepSeek itself published**, not a lossy
re-compression of a bf16 original. **Check `config.json` before repeating the generic
precision caveat for a given model — it is not equally true everywhere.**

⚠️ **`deepseek-v3` and `deepseek-r1` have no `hosted` block on purpose.** R1 has exactly
one priced host, which fails the `n >= 2` guard — correctly, a single host is not a
spread. V3's three hosts are all *dearer* than its stored $0.14, but that stored figure
is a **retired last-known rate**, not a live price, so the comparison would be
meaningless in the other direction too.

### `deepseek-v3`'s licence — resolved, and it is not MIT

Previously recorded as `"not stated in model-card metadata"`, which was accurate but
unhelpful. The repo carries **two** licence files: `LICENSE-CODE` is MIT, and
`LICENSE-MODEL` is the **"DEEPSEEK LICENSE AGREEMENT Version 1.0, 23 October 2023"** —
a bespoke licence governing the weights. Now recorded as such with `osi: false`.
**"DeepSeek is MIT" is true of V4 Flash, V4 Pro and R1 and false of V3**, so the split
is per-model here too.

### Not yet done

- **Xiaomi (MiMo) and Tencent (Hunyuan) are not tracked and outrank Kimi on OpenRouter
  token volume** — see A10, which now carries the evidence for both.
- **The consumer plans for these three labs are researched but NOT in the repo** — see
  **A11**. Z.ai's is the strongest allowance disclosure found anywhere so far.

---

## A11. The Chinese labs' consumer plans — researched 2026-08-30, deliberately NOT shipped

**Nothing in this section is in `prices.json` or `plan-limits.json`.** The 2026-08-29
change was scoped to the per-token view on purpose. This entry exists so the research
survives, and because **one finding contradicts the reason the scope was drawn that
way.**

When the scope was set, the argument for leaving subscriptions out included "cap data
for these labs will mostly be undisclosed." **That was wrong, and backwards for Z.ai.**

### Z.ai's GLM Coding Plan is the best allowance disclosure in the dataset

`z.ai/subscribe` (rendered) and `docs.z.ai/devpack/overview.md`, read 2026-08-30:

| Plan | Monthly | Annual (−30%) | Weekly credits | 5-hour credits |
|---|---|---|---|---|
| Lite | **$18** | $12.60 | 10,000 | 2,000 |
| Pro | **$80** | $56.00 | 60,000 | 12,000 |
| Max | **$168** | $117.60 | 140,000 | 28,000 |

It publishes, on its own docs, **all four** of the things this project spends its time
saying nobody publishes:

1. **Absolute credit allowances**, on two windows (rolling 5-hour *and* weekly).
2. **The credit formula**: `(input × in-mult + cached × cached-mult + output × out-mult) / 10,000`.
3. **Per-model multipliers** — GLM-5.3 `6.9 / 1.7 / 24`, GLM-5.3-Flash `2.3 / 0.56 / 8`;
   MCP tool calls `1.2` per call.
4. **A token conversion table** — e.g. Lite on GLM-5.3 at 95% cache hit is
   **48–97M tokens/week** — with the range's two ends defined (all-peak vs all-off-peak)
   and peak stated as **Mon–Fri 14:00–18:00 SGT**.

**This is more complete than Perplexity's**, which E1k records as the only exception
among the eight (credits + a conversion + typical task costs). Z.ai adds the raw
formula and the multipliers, so the allowance is independently computable rather than
illustrated. **If it is ever graded, it is a 🟢 and it is the strongest cell on the
axis.**

⚠️ **If these plans are added, quote the MIN of the token range, not the max.** The
range's top assumes 100% off-peak. That is the same discount-you-don't-control problem
`_deepseek_peak_offpeak` already resolved for DeepSeek by storing peak rates; be
consistent or the plan looks better than it is.

### Kimi is the exact opposite, and the contrast is the finding

`kimi.com/membership/pricing` (rendered), read 2026-08-30. Personal tiers, all
currently **"Join Waitlist"** — a banner says new plans are coming and existing
subscribers are unaffected, so **these are announced, not purchasable, and must not be
recorded as live consumer prices.** Free tier is "Adagio, $0".

| Plan | Monthly | Annual | Allowance as published |
|---|---|---|---|
| Moderato | $19 | $180/yr | "more agent credits" |
| Allegretto | $39 | $372/yr | "2x agent credits" |
| Allegro | $99 | $948/yr | "5x agent credits" |
| Vivace | $199 | $1,908/yr | "10x agent credits" |

**Kimi's own comparison table quantifies six other limits precisely** — concurrent
tasks (1/2/2/4/4), scheduled tasks (2/10/15/20/25), widget tasks, projects
(2/20/20/100/100), **project storage to the megabyte** (500MB/20GB/20GB/50GB/50GB),
swarm subagents (2/4/8/8). **The only thing it will not put a number on is the meter.**
"More agent credits" — more than what? The base is never stated anywhere on the page.

**That is the sharpest illustration of the site's central finding yet, and it is worth
using:** this is not a company that can't quantify, or hasn't got round to it. It
quantifies storage to the megabyte on the same table. Withholding the credit base is a
choice about which number is commercially sensitive.

### Qwen Chat — NOT ESTABLISHED, and that is the correct state

`chat.qwen.ai/pricing` redirects to the chat root and requires login. No public pricing
page was found. **Every source that surfaced was an SEO price-aggregator site**
(`aipricing.guru`, `aitoolsatlas.ai`, `aitooltier.com`, `aiplans.dev`, `agentplans.fyi`),
and this project does not accept those — the whole Alibaba correction in F1d came from
trusting a secondary summary.

**Record this as ⚪, not 🔴.** We could not read it; that is not the same as Alibaba
publishing nothing. Anyone picking this up: log in, or find an Alibaba-owned page.

### Why this matters beyond the three labs

The three span the **full range of the disclosure axis** — 🟢 Z.ai, 🔴 Kimi, ⚪ Qwen —
which kills any framing where disclosure quality tracks geography. It is the same
lesson E1g drew from xAI scoring 🔴 on all six environmental dimensions while taking 🟢
on three of five data-practice ones: **the axes are independent and must never be
averaged, and neither must the countries.**

### SHIPPED 2026-08-30 — Z.ai only, and it changed a headline statistic

Rory asked for "all subscription models" for the three labs. **Only Z.ai's could be
shipped**, and the reasons the other two could not are findings in themselves:

- **Z.ai — SHIPPED.** `Z.ai (Free)` plus GLM Coding **Lite $18 / Pro $80 / Max $168**,
  with `plan-limits.json` entries carrying the real credit caps on both windows.
- **Kimi — NOT SHIPPED.** Re-checked on 2026-08-30: **every CTA on the page is
  "Join Waitlist"**, on every tier. The banner says "you can still buy the current
  plan" but that plan's price is nowhere on the page. So the $19/$39/$99/$199 tiers
  are **announced, not purchasable, and the currently purchasable price is unknown to
  us.** Shipping them would publish prices nobody can pay. Re-check when the waitlist
  opens.
- **Qwen — NOT SHIPPED, ⚪.** Still login-walled, still no primary source.

**The headline statistic moved, and in the right direction.** The subscriptions callout
went from *27 plans, 2 disclosed* to **31 plans, 5 disclosed**. The finding is now
sharper rather than weaker, and the page states it as a split:

> The 2 figures that are published cover a single feature rather than the plan …
> Only 3 publish an allowance that bounds the whole product … every one of them from
> Z.ai, which also publishes the credit formula, the per-model multipliers and a token
> conversion, so the allowance can actually be checked.

**Both halves of that sentence are derived from `plan-limits.json`** — including the
attribution. The first draft hardcoded "every one of them from Z.ai", which is the same
stale-superlative bug as E3a one layer down; `check-prices.js` §10 now fails on that
exact string.

### ⚠️ Two live caveats on these rows

**1. The Ceiling column deliberately refuses to price them.** Z.ai's caps are in
**credits**, and `ceiling()` multiplies a cap by a cost *per message* — so 10,000
credits would render as 10,000 messages, turning the best allowance data on the table
into the worst number on the page. `capPerDay()` now skips any cap whose `unit` is not
`messages`, on the same principle as the `scope_limited` skip beside it.

**THE OPPORTUNITY, and it is real:** Z.ai publishes everything needed to convert
credits → tokens → messages (the formula, the per-model multipliers, a token table, and
the archetypes already give tokens/message). **Z.ai could become the first plan on the
site with a genuinely computed Ceiling.** Two cautions: the conversion needs a
cache-hit assumption, and Z.ai's own token range is already ~2× wide because peak
(Mon–Fri 14:00–18:00 SGT) costs double off-peak — **quote the all-peak end**, per
`_deepseek_peak_offpeak`.

**2. Break-even for these rows has NO reasoning multiplier behind it.**
`reasoning-measurement.json` covers four models — two Anthropic, two OpenAI — so
`reasoningMult()` returns **1** for GLM, i.e. *no thinking at all*. GLM-5.3 has a
documented thinking mode. An unmeasured multiplier understates output tokens, which
lowers cost-per-message, which **raises** the break-even threshold — so the plan looks
*harder* to justify than it is. That is the conservative direction, but it is still
wrong, and it is the same gap that would undercount **Kimi K3, which Moonshot's docs
say "always reasons" at default effort `max`.** Measuring it needs API keys for
Qwen / Z.ai / Moonshot; only an OpenAI key is in `scripts/.keys.local.json`.

---

## A10. "Biggest" depends on which measure, and they disagree (2026-08-29)

The three labs were picked as "the largest by user base". Checked rather than assumed,
and **the three measures do not agree**, so any future "biggest" claim needs to say
which one it means:

| Measure | What it actually measures | Order |
|---|---|---|
| HF 30-day downloads | self-hosting / research adoption | Qwen **315.5M** ≫ DeepSeek 25.3M > Z.ai 11.2M > MiniMax 7.5M > Moonshot 5.2M > Tencent 1.5M |
| HF likes | community attention | Qwen 125.6k > DeepSeek 72.4k > Z.ai 43.3k > Tencent 30.3k > Moonshot 25.2k > MiniMax 15.1k |
| OpenRouter weekly tokens | hosted API consumption | DeepSeek V4 Flash 12.3T (#2), **Xiaomi MiMo-V2.5 9.98T (#3)**, **Tencent Hy3 6.62T (#5)**, GLM 5.3 Flash 4.62T (#8), GLM 5.2 3.11T (#10) |

**Qwen is unambiguously first and Z.ai is solidly second.** **Kimi is the weak pick:**
it appears in no OpenRouter top-10 entry, and both Xiaomi's MiMo and Tencent's Hunyuan
move more tokens than anything Moonshot ships. It survives on downloads and likes, and
on having a large consumer product outside these measures. If a fourth lab is ever
added, **MiMo or Hunyuan has the better evidence than MiniMax**, which leads Moonshot
on downloads but trails it everywhere else.

Note that OpenRouter's top 10 is *dominated by Chinese open-weight models* — five of
the ten, plus a stealth model at #1. That is context for how large this category has
become relative to the eight providers the site tracked before.

### The two measures are close to opposites, and that is the real finding

Followed up 2026-08-29 with HF totals for the two labs that beat Kimi on tokens:

| Lab | HF downloads (30d) | HF likes | OpenRouter rank | Flagship licence |
|---|---|---|---|---|
| Qwen | **315.5M** | 125.6k | *absent from top 10* | bespoke |
| MiniMax | 7.5M | 15.1k | absent | — |
| Moonshot (Kimi) | 5.2M | 25.2k | absent | bespoke |
| Tencent | 1.5M | 30.3k | **#5** (Hy3, 6.62T) | Hy3 apache-2.0 |
| Xiaomi (MiMo) | **0.71M** | 3.5k | **#3** (MiMo-V2.5, 9.98T) | MIT |

**Xiaomi has the smallest HuggingFace footprint of every lab considered and the third
largest API token volume on OpenRouter.** Qwen is the exact inverse. The two metrics
are not noisy versions of one ranking — they measure **self-hosting** and **hosted API
consumption**, and a cheap model with no community mindshare can dominate the second
while barely registering in the first. MiMo-V2.5 is $0.14/$0.28 and Hy3 is
$0.132/$0.528, which is most of the explanation.

**So "biggest" cannot be stated without naming the measure**, and the site should
probably never claim it flatly.

**If a fourth lab is added, the open/closed pattern repeats and reinforces the badge
design:** Tencent's newest flagship `hy4-preview` (2026-08-28) is **closed** while Hy3
is Apache-2.0 — the same shape as Alibaba. **ByteDance Seed is closed across its entire
line**, which makes it the cleanest counter-example to "Chinese labs open-source
everything" if that claim ever needs rebutting. Xiaomi publishes both its models, MIT.

---

### A7. Non-token fees — what break-even does not carry

**Surveyed 2026-08-26 on provider-owned API pricing pages.** Our cost per message is
input tokens + output tokens. Every provider we track except DeepSeek also charges
per *call* for things a normal chat message can trigger — search above all.

| Provider | Per-call fee on top of tokens | Source |
|---|---|---|
| OpenAI | Web search **$10 / 1k calls** (all models); **$25 / 1k** on the non-reasoning preview tool; Code Interpreter container from **$0.03 / 20-min session**; file search storage $0.10/GB/day | `platform.openai.com/docs/pricing` |
| Anthropic | Web search **$10 / 1k searches**; code execution **$0.05 / container-hour** past 1,550 free hours (free when paired with web search/fetch); managed-agent session runtime $0.08/hr | `docs.claude.com` pricing |
| Google | Grounding with Google Search: **5,000 free/month** shared across Gemini 3.x, then **$14 / 1k requests**. One user request may fire several search queries, each billed. Retrieved context is *not* charged as input tokens | `ai.google.dev/gemini-api/docs/pricing` |
| xAI | `web_search` **$5 / 1k**, `x_search` **$5 / 1k**, file search $10 / 1k; image-view tools charge tokens only | `docs.x.ai/docs/pricing` |
| Perplexity | **$5 / 1k requests** on Sonar / Sonar Pro / Sonar Reasoning Pro, plus the Search API at $5 / 1k | `docs.perplexity.ai` |
| Mistral | "tool APIs are priced per call" — **no figure published** on the pricing page. Unverified, so nothing to quote | `mistral.ai/pricing` |
| DeepSeek | **None.** Cache-hit pricing and the peak/off-peak clock only | `api-docs.deepseek.com` |

**Which way the error runs:** omitting a real cost makes the API look cheaper, which
pushes break-even **up** — we print a higher messages-per-day bar than the truth, so a
plan looks *harder* to justify than it is. That is the conservative direction for a
"should I pay?" tool, and it is still wrong. Prompt caching biases the opposite way
(real API cost is lower than we model), so the two partly cancel — by an unknown amount.

**Why it is not modelled:** we have no honest figure for how often a given person’s
messages trigger a search. Inventing a rate would replace a stated gap with a number
nobody can check, which is the thing this project exists not to do. If it ever is
modelled, it needs to be a visible input the reader can set, like the archetype.

**Re-verify:** these are prices and they move. Treat as A1-class — check with the
per-token pass.

## A8. Break-even inputs — archetypes and thinking tokens

**Every break-even on the site is price ÷ cost-per-message ÷ 30, so cost-per-message
is the whole game.** Two things feed it and both changed on 2026-08-26.

### Archetypes — now generated, not hand-picked

**Owner:** `scripts/derive-archetypes.js`. Run `--write` to regenerate; never hand-edit
the numbers.

It splits the old assumption in half and measures the half that can be measured:

- **Message lengths** (`prompt_chars`, `reply_chars`, `history_turns`) are still
  judgement — but stated in characters, which a person can check against a real chat
  window. "A 1,800-character reply" is falsifiable; "500 output tokens" is not.
- **Characters → tokens** is measured with the real cl100k tokenizer over this repo’s
  prose: **3.882 chars/token, 165 samples.** No folk 4-chars-per-token constant.

| Archetype | prompt | reply | history | → input | output |
|---|---|---|---|---|---|
| light | 220 ch | 900 ch | 2 turns | 635 | 232 |
| standard | 450 ch | 1,800 ch | 6 turns | 3,596 | 464 |
| heavy | 1,400 ch | 4,200 ch | 10 turns | 14,791 | 1,082 |

**Reproducibility:** the script normalises CRLF to LF before counting. Without
that the measured ratio depends on the checkout — a Windows working copy and a Linux
CI runner disagreed (3.911 vs 3.882) on the first CI run, and a measured constant that
changes with the platform is not one. The guard also carries a **2% tolerance**,
because the corpus includes docs that change most days; the two in-page copies are
still compared exactly, since a copy has no excuse for differing.

This is **not** a measurement of real chat traffic — there is no such corpus here, and
the file says so in those words. The intended anchor is still real EcoMeter exports.

**Three copies:** `plan-limits.json._meta.archetypes`, `audit.html` `ARCHETYPE`,
`pricing.html` `FALLBACK_LIMITS`. `check-auditor.js` re-runs the derivation and fails
on any of the three drifting, plus on `pricing.html`’s `CHARS_PER_TOKEN`.

### Thinking tokens — now priced

**Source:** `plan-limits.json._meta.reasoning.models` (lo/hi/mid; `mid` is applied).

A reasoning model emits hidden chain-of-thought before its reply and bills it at the
output rate. Counting only the visible reply understated API cost by **30–45% on the
frontier models people actually pay for** — and, being an understatement of cost, it
pushed break-even *up*, printing a higher bar than the truth.

| Plan | Before | After |
|---|---|---|
| ChatGPT Plus | 26–127 msgs/day | **16–141** |
| Claude Pro | 21–103 | **13–114** |
| Google AI Pro | 48–137 | **28–151** |
| Perplexity Pro | 48–51 | **32–41** |

**These multipliers are estimates, and coarse ones.** No provider publishes per-model
thinking-token statistics, so nobody outside them can measure it. They are modelled
anyway — unlike search fees and caching — because the omission was large and
one-directional, and because EcoMeter has modelled it since it shipped: the website
being out of step with our own extension was the harder position to defend.

**They do not have to stay estimates.** `scripts/measure-reasoning.js` measures them
against the providers’ own APIs and writes the result back with `measured: true`,
`n` and `as_of`. Dry-run first (it prices the run from our own `prices.json`); a full
pass over all five models and 24 prompts costs about **$3**.

```bash
node scripts/measure-reasoning.js                 # cost estimate, sends nothing
node scripts/measure-reasoning.js --run --write   # measure and update plan-limits.json
```

| Provider | How the number is obtained |
|---|---|
| OpenAI | Reported: `usage.output_tokens_details.reasoning_tokens` |
| Google | Reported: `total_thought_tokens` against `total_output_tokens` |
| Anthropic | **Derived** — thinking is billed inside `output_tokens` and the raw chain of thought is never returned, so the ratio is `output_tokens ÷ count_tokens(visible reply)` |

**What it measures is the API, not the app.** ChatGPT and Claude route and tune
thinking their own way behind the paywall and publish nothing about it. That is the
right scope anyway: break-even asks what the same usage would cost *on the API*.

**The corpus is deliberately ordinary** (`scripts/reasoning-prompts.json`, 24 prompts
across quick / writing / research / coding). Benchmark problems would measure the hard
case, overstate API cost, understate break-even, and tell people a subscription pays
for itself sooner than it does — the direction that costs the reader money.

`check-auditor.js` refuses a `measured: true` row that has no `n` and `as_of`, so the
flag cannot be set by hand.

**Four of them are now MEASURED** (`scripts/measure-reasoning.js`, 24 ordinary chat
prompts per model against each provider's own API). **All four guesses were too high:**

| Model | Guessed | Measured | n | By group | Date |
|---|---|---|---|---|---|
| Claude Opus 5 | ×3.0 | **×1.8** (1.1–2.1) | 23 | writing 1.3 · quick 1.7 · research 1.9 · coding 1.9 | 08-27 |
| Claude Sonnet 5 | ×2.0 | **×1.0** | 24 | 1.0 everywhere — no thinking at all | 08-27 |
| GPT-5.6 Sol | ×3.0 | **×1.2** (1.0–1.9) | 24 | writing 1.0 · research 1.2 · quick 1.3 · coding 1.8 | 08-28 |
| GPT-5.6 Terra | ×2.5 | **×1.1** (1.0–2.0) | 24 | writing 1.0 · quick/research 1.1 · coding 1.6 | 08-28 |

**Three findings that generalise:**

1. **Reasoning models mostly do not reason on ordinary questions.** Sonnet 5 returns
   `thinking_tokens: 0` on all 24; Terra and Sol return zero thinking on the writing
   group. We were charging readers for deliberation that never happens.
2. **Task type predicts it, consistently across vendors.** Writing ≈ 1.0, quick
   questions slightly above, research higher, coding highest. The archetype selector
   could eventually carry a per-group multiplier rather than one number per model.
3. **Anthropic thinks more than OpenAI on the same prompts** — Opus 1.8 against Sol 1.2.

Break-even moved up everywhere as a result: **ChatGPT Plus 16→26 msgs/day**, Claude Pro
13→17, Max 5× 63→86, Max 20× 127→172, Perplexity Pro 32→50.

**Still estimates:** `gemini-3.1-pro-preview`, the o-series and the DeepSeek rows. Four
guesses checked, four too high — assume the rest are too.

**⚠️ Gemini is BLOCKED, not merely undone — needs Rory.** On 2026-08-28, creating a key at
`aistudio.google.com/apikey` failed with **"failed to generate key, the request was
suspicious"** on a personal Gmail account with no VPN. That is Google's anti-abuse
system and it gives no detail, no reason code and no appeal. What is already ruled out:
VPN, managed/Workspace account, and the wrong URL. What is left to try, cheapest first:

1. Retry after a day or two — the signal is often transient, and rapid retries make it worse.
2. A different personal Google account, ideally an older one with a recovery phone.
3. **Vertex AI instead of AI Studio** — same models, different auth (a Cloud project plus
   `gcloud` ADC rather than an API key). It needs a Vertex code path in
   `measure-reasoning.js` that does not exist yet: roughly an hour's work to measure
   one number.

**The measurement is FREE when it does work** — `gemini-3.1-pro-preview` has a free tier
(`Input price: Free of charge`, checked 2026-08-28), so this is blocked on access, not
money. Note the free tier's trade: Google uses free-tier prompts to improve its products,
which is acceptable for a corpus of 24 synthetic questions and would not be for anything
else.

**Until then nothing is overclaimed:** every surface that shows a Gemini break-even says
"our estimate — not yet measured for this model", and `check-auditor.js` will not let
`measured: true` be set by hand.

**The multiplier is applied in TWO places and they must agree:** `breakEven()` (the
figure shown) and `apiCostPerMonth()` (the figure the downgrade recommendation is
made on). For one day it was only in the first, so the Auditor advised dropping plans
against an API bill it had understated by ~30%. `test-auditor.js` now asserts the two
agree per message across four models; verified by reverting the fix.

**The claim that this cannot be measured from outside was wrong**, and it was in this
file. Providers publish no per-model statistics, but all three report thinking tokens
**per response** in `usage` — `output_tokens_details.reasoning_tokens` (OpenAI),
`output_tokens_details.thinking_tokens` (Anthropic), `total_thought_tokens` (Google).

**Two method bugs, both found after the first paid run and worth not repeating:**

1. The first version *derived* Anthropic’s figure by subtracting a `count_tokens` of
   the visible reply, not knowing the field existed. `count_tokens` on an assistant
   message adds ~20 tokens of framing, so a reply with no thinking came out **negative**
   and clamped to exactly 1.0 — indistinguishable from a real 1.0.
2. `max_tokens: 4096` truncated long replies. Thinking is emitted first, so a truncated
   answer shrinks the visible half and **inflates** the ratio. Now 16,000, and any
   response that still hits the cap is discarded rather than counted.

`--from-report` applies a stored report without re-billing the API.

**Three copies again:** `plan-limits.json` (source), `pricing.html`’s
`FALLBACK_LIMITS.reasoning` mirror (used when the fetch fails), and
`extension/sidepanel.js` `REASONING_RANGES` (older, covers the o-series and R1).
`check-auditor.js` fails on mirror drift, on a `mid` outside its own lo/hi, on a model
with no API rate, and where the extension and the site contradict each other on a
model both name. All four verified by injecting the fault.

**Still not modelled, and both stated on the page:** per-search fees (§A7, pushes
break-even down) and prompt caching (pushes it up). They partly cancel, by an unknown
amount.

# B. Plan limits, caps and disclosure

## B1. The caps themselves

**Goes stale in one direction:** providers are *withdrawing* figures, not adding
them. Between 2026-07-28 and 2026-08-08 OpenAI deleted the only general absolute
cap anyone published.

**Source of truth:** `plan-limits.json` → `plans[]`, each carrying a provenance:
`disclosed` / `derived` / `third_party` / `not_disclosed`.

**Copies:**
- `pricing.html` → `FALLBACK_LIMITS` — a **seventh** copy of this data, 31 rows, **generated from `plan-limits.json`, not hand-copied** (2026-08-30). It had drifted to 27 rows with no Z.ai at all while the callout derived "31 plans / 5 disclosed" from whatever was loaded, so a failed fetch printed a different finding from the one the data supports. `pricing.html` → `SUBSCRIPTIONS` had drifted the same way, to 26.
- `audit.html` → `PLANS[].cap` + `.capSource` — uses `estimate` where `plan-limits.json` says `not_disclosed`, because the Auditor needs a working number. **Only `disclosed` may be shown to a user as fact.**
- `audit.html` → `PLANS[].unquantifiedWindow` — the fetch-failure fallback for B6. Diffed both ways by `check-auditor.js` §18.

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

**Window trap (added 2026-08-30):** a plan can publish **several** windows and they
all constrain. There used to be a `binding` field naming one; it is gone and must not
come back — `check-prices.js` §11 fails on it. Which window bites is a property of the
**user**, not the plan, so a plan cannot name it: the short window stops a burst, the
long one stops sustained use. `capPerDay()` takes the **smallest** messages-per-day
any published window permits, because that is what a month of maxed-out use can
actually contain.

**Guard:** `check-auditor.js`, `check-prices.js` §11

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

**From 2026-08-08 to 2026-08-30 it computed for ZERO plans**, which was deliberate —
an empty column *is* the finding. **It now computes for three: the Z.ai GLM Coding
tiers, at $84 / $506 / $1,181 a month against prices of $18 / $80 / $168.** Those are
the first Ceiling figures the site has ever printed.

**Why they are honest, and what would make them not:**

- Every input to the credits→messages conversion is **Z.ai's own published figure** —
  the formula, the divisor, the per-model multipliers. Nothing is estimated. See
  `_meta.credit_conversion`.
- The **weekly** window binds, not the 5-hour one, by exactly **6.72×**. Reading only
  the 5-hour figure would have printed $567/mo against an $18 plan and called it 31×
  the price. **That number would have been the single most wrong figure on the site,
  and it would have flattered the provider.**
- Two assumptions are ours and **both make the ceiling smaller**: `cache_hit: 0` and
  `peak: true`. Z.ai's own table assumes a 95% cache hit and its token range's top end
  assumes all-off-peak credits at half price. `check-prices.js` §11 fails if either is
  flipped, because either would raise every ceiling on a discount the reader cannot
  verify.

**The size of that choice, measured, because "conservative" without a number is just a
word:** GLM Coding Lite is **$84/mo at 0% cache, $114 at 50%, $167 at Z.ai's own stated
95%** — so the shipped figure is roughly **half** what Z.ai's own assumption would
produce. This is the one place the column is deliberately not an upper bound: a Ceiling
is supposed to be the outer edge of possible, and ours is the low end of it. That is
the right direction for this project, but **it is a real understatement and should be
stated as one, not defended as precision.** If a reader's actual cache hit is ever
knowable (an EcoMeter export would do it), this is the field to revisit.

**Check each pass:** the figure is nearly **archetype-independent** ($82–$85 for Lite
across light/standard/heavy), because credits and dollars are near-proportional at
Z.ai's own rates. That stability is the strongest evidence it is a real number rather
than an artefact of our token assumptions — **if a future re-verify sees it swing
widely by archetype, something has broken in the conversion, not in the plan.**

**The residual drift is itself a small finding:** Z.ai's credit multipliers weight
output slightly *less* against input than its own API prices do (6.9/24 vs 1.4/4.4),
so long-output use is marginally better value on the plan than on the API. It is worth
about 4% across the archetype range and is not currently stated anywhere user-facing.

**Still zero for everyone else, and that is still the finding.** Nobody else publishes
an allowance that bounds a whole plan.

## B6. Unquantified windows — the bias we label rather than guess (added 2026-08-30)

**Anthropic, Google and Perplexity each state that a weekly cap exists and none
publishes a number for it.** That makes every cap figure derived from a *shorter*
window a **burst rate**: right for a day, wrong for a week, and biased **high** — and
high on a cap flatters the plan.

This had been sitting in `plan-limits.json` as prose since at least 2026-07-28 ("A
weekly cap sits under the 5-hour window and binds first, so the limit cannot be hit
every day for 30 days") while `audit.html` shipped `cap: 144` — which is precisely
45/5h held every waking hour for thirty days. **The prose knew; the number didn't.**

**Source of truth:** `plan-limits.json` → `plans[].unquantified_windows[]`, each with
`window` / `stated` / `source` / `effect`. Sourceless entries fail `check-prices.js`
§11: an asserted absence is only as good as the fetch behind it (E1g).

**We do NOT invent the missing number, and this is the load-bearing decision.** The
Auditor's fit test reads `cap` to decide whether a tier is big enough, so guessing a
lower figure would push readers onto a **pricier tier on a number nobody published** —
the exact harm this project exists to prevent. The number stays; the claim attached to
it changes.

**Where it surfaces:**
- `pricing.html` ceiling cell — a third-party figure on a shorter window is labelled
  "a burst rate, not a sustainable one". Perplexity Pro correctly gets **no** such
  label: its third-party figure is already weekly, so there is no shorter-window bias.
- `pricing.html` math panel — the full provider statement, outside the ceiling block,
  because the plans that have an unquantified window are exactly the plans with no
  computable ceiling. The first draft rendered it inside and reached nobody.
- `audit.html` — fires only for readers at **≥24 days/month**, since a weekly cap
  cannot bite a four-days-a-month user. This is the one thing a per-day model cannot
  express: the same daily number is sustainable for one reader and not another.

**Re-verify:** if a provider ever *publishes* the weekly figure, this becomes a real
cap and the row moves to `caps[]`. Watch Anthropic's usage-limits article — it already
describes the mechanism, so quantifying it is one sentence away.

**Guard:** `check-prices.js` §11 (shape + sources), `check-auditor.js` §18 (the two
copies agree, both directions), `test-auditor.js` §6 (the caveat reaches `r.why`, and
stays quiet for the readers it cannot bite). All eight destructive paths validated by
reintroducing the bug.

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
**how old each `as_of` is**: a warning at 30 days, a hard fail at 60, plus the same
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

_Confirmed unchanged and verbatim: Google's 31 Dec 2026 deadline, payment method required, $19.99/$4.99 auto-conversion (blog.google, 19 Aug 2026); "Available for free to verified students, teachers, and open-source maintainers" (github.com/education/students); ChatGPT for Teachers free for verified U.S. K-12 educators through June 2027 (chatgpt.com/pricing FAQ); "Verified students can get Mistral Pro for $5.99 / month (normally $14.99)" (mistral.ai/pricing); still exactly nine institution logos on Anthropic's higher-education page, matching our named list. **DeepSeek re-checked 2026-08-27** (deepseek.com loaded on the third attempt after two navigation blocks): "Free access to DeepSeek", and the only pricing link on the entire site is API Pricing — there is no consumer plans page for a student discount to exist on. Row now carries a source, which a "none" finding should always have had, and all six routes are verified within the same week._


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
- Inference spend — **weakest link**; is it still a vendor-revenue proxy? (see D4)
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

- **`spend` is mislabelled at source, and the level is still unfixed.**
  `spendPerYear` is anchored to MarketsandMarkets' *AI inference market* size, which
  that report scopes as infrastructure **vendor revenue** — accelerators, HBM/DDR,
  networking, cloud inference services. It therefore **overlaps `capexPerYear`**
  (the same silicon, counted from the other side of the transaction) rather than
  being "distinct from buildout capex", which is what `ai-clock.html` claimed until
  **2026-08-28**. Prose corrected then; the **level was left alone on purpose** —
  no better-sourced worldwide inference-opex figure was found, and inventing one is
  worse than a weak number that says it's weak. The per-unit cost line inherits the
  problem: infrastructure revenue ÷ *all* tokens, free-tier and internal included.
  The page now calls that directional only. **Next re-anchor, go looking for a real
  inference-opex total** and re-level, don't just re-label.

- **⚠️ UNVERIFIED SUPERLATIVE, flagged 2026-08-30, not resolved.** `ai-clock.html`
  says of the prompts counter: *"The only official disclosure is still ChatGPT's ~2.5
  billion a day (18 billion messages a week)."* The **ChatGPT figure itself is
  sourced** (OpenAI "How People Use ChatGPT", NBER Sept 2025) and the page correctly
  says OpenAI has not refreshed it. **What is NOT established is the word "only."**
  Nobody has checked whether another assistant has since published a prompt or
  message volume — one search for Gemini app query volume returned nothing usable,
  which is not evidence of absence.

  This is the same shape as the two superlatives corrected on 2026-08-30 (E3a), and
  it is flagged rather than fixed because settling it means checking every major
  provider's disclosures, not one search. **Either verify it across providers or
  soften it to "the only one we have found."** Note the claim is load-bearing in the
  honest direction — it exists to tell the reader the counter rests on one old
  number — so it is not urgent, but it is exactly the class of sentence that rots.

- **`index.html`'s "None of the major providers show you this" (water/energy) was
  read on 2026-08-30 and STANDS**, on the narrow reading that "show *you*" means
  surfacing your own usage's footprint in the product, which none of them do. It is
  close to the line: Google publishes a median per-prompt figure (0.26 ml) and
  Alibaba now publishes fleet PUE and WUE (F1d). **If that sentence is ever
  broadened to "publish", it becomes false.**

- **An external cross-check exists for the per-unit panel and we are not allowed to use it.**
  Ornn's Token Price Index — realized $/Mtok per lab, free no-key API at
  `api.ornnai.com`, one month of daily history — is the closest external reference to
  that panel, and reading it is what exposed the `spend` problem above. Their terms
  (https://data.ornn.com/terms) forbid republishing the data, separately forbid using
  it to "create, calculate, validate, benchmark" any index or derived product, and
  state that attribution and caching are not consent. So it cannot go in `clock.json`
  and it cannot go in `check-clock.js`. **Don't re-research this** —
  `_meta.why_no_external_token_price_index` records the whole finding. Written consent
  from Ornn is the only route in.

---

# E. Transparency Index and datacenters

## E1. `transparency-index.json`

**Two cells changed 2026-08-28, both found by building on the numbers rather than
re-reading the reports** — `_meta.last_verified` moved to 2026-08-28, no grade moved:

- **Google / comparability** gained the finding that its per-prompt figures have
  **no published denominator**. Google reports 0.24 Wh and 0.26 mL for the *median*
  Gemini Apps text prompt but never says how many tokens a median prompt is, so the
  number cannot be turned into a rate, checked against a per-token benchmark, or
  applied to your own usage. Searched arXiv:2508.15734 directly; it is not there.
  **Mistral, publishing far less overall, states its figure per 400-token prompt and
  is therefore usable.** ⚠️ **RESOLVED 2026-08-29 — see E1m, and the answer is not
  what this entry assumed.** It is not a number Google holds and withholds: the
  metric is a volume-weighted median across MODELS, so no token count exists to
  publish. That also means it is **not** an error source the water model can close
  by getting the denominator — the two quantities are not comparable at all.
- **OpenAI / comparability** was **corrected**: it said OpenAI had published no water
  numbers, which overstated the case. Altman's 0.32 ml per query (Jun 2025) exists and
  is widely cited as if it were a disclosure. Still 🔴 — no methodology, boundary,
  token count or scope, and nothing to audit it against — but "no number" and "a
  number you cannot check" are different findings, and we were making the wrong one.
  Caught because `water.json` cites that figure while this file denied it existed:
  **two files in this repo disagreed about a fact.**

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

**Axes state:** all three are `scored` in `_meta.axes` — and have been since
2026-08-25. **This entry used to say pricing and data practices were `pending`
("criteria not yet defined"), which was false for four days short of a year of
reading it.** The JSON was right; two of its three descriptions were not (the
other was PROJECT-CONTEXT §10). ⚪ is still not the same as 🔴 and the copy must
keep saying so — one ⚪ remains, Microsoft's API rate card, by design.

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
   25 of 27 plans publish nothing (26 of 27 until 2026-08-29 — see E1k). That count comes from `plan-limits.json`, so
   **re-count it whenever that file is verified** rather than trusting the prose.
   The trend is one-directional and hostile: OpenAI *deleted* its only general cap
   between two checks. A 🔴 here is not safe to assume permanent in either
   direction.
2. **`rate_card`** — tracks `prices.json`. Four providers moved prices in the 22
   days before 2026-08-24. If `check-prices.js` fires, this column may need a look.
3. **`context_window`** — **CORRECTED 2026-08-29. "OpenAI is currently alone" was
   never true**, and this entry said so for four days short of a year. Google
   publishes a per-plan table (no plan 32k / AI Plus 128k / AI Pro & Ultra 1M) on
   its Gemini Apps limits page, archived live on **2026-08-14**; Anthropic
   publishes per model (Opus 5 and Sonnet 5 1M on all paid plans, Opus 4.8/4.7/4.6
   and Sonnet 4.6 500K, otherwise 200K), with separate figures for Claude Code and
   Cowork. Both moved 🔴→🟢. **Microsoft, Mistral, DeepSeek and Perplexity were NOT
   re-checked in that pass** — two of the three that were checked turned out wrong,
   so treat those four as unverified rather than as findings.
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
- **(2026-08-29) Anthropic — "Who can view my conversations?": data de-linked from the user ID "before any review", "access is limited to a small number of personnel involved in model training", with the flagged-conversation carve-out that survives opting out**
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

## E1g. The 2026-08-29 re-read — six cells were wrong, five against the provider

**This is the worst error this index has recorded, and it is worth reading before
trusting any 🔴 on the data-practices axis.** Every corrected cell had been
published by the provider all along. Wayback confirms it: the sources were live,
in the exact wording now quoted, on the day we graded them.

| Cell | Was | Now | What it actually said |
|---|---|---|---|
| xAI `training_default` | 🔴 | 🟡 | "We may use your content and interactions with Grok … to train our models." |
| xAI `optout` | 🟡 | 🟢 | Settings → Data Controls → "Improve the model", with three limits stated |
| xAI `human_review` | 🔴 | 🟢 | "A limited number of our authorized personnel may review your conversations" |
| OpenAI `retention` | ⚪ | 🟢 | Privacy policy §4 "Retention": deleted data gone "within 30 days" |
| Perplexity `optout` | ⚪ | 🟡 | "AI Data Retention is enabled by default", Account settings → Preferences |
| Perplexity `retention` | ⚪ | 🟡 | "removed from our servers within 30 days" on account deletion |

**The xAI row is the one that should sting.** Three of four cells wrong, on the
provider this index is otherwise hardest on, in the row the Subscription Auditor
reads for its privacy answer — so it was wrong in user-facing advice, not just in
a table. `x.ai/legal/faq` archived on **2026-08-25 at 16:58** is
**character-for-character identical to today's**, 115 lines both, differing only
in a footer social handle's capitalisation. The old note said "we read both the
consumer privacy policy and the consumer FAQ … and neither states". The FAQ has a
heading that asks the exact question.

### The rule this produces

> **An asserted ABSENCE is only as good as the fetch behind it.** Perplexity and
> xAI failed the same way — a page that did not render. At Perplexity that was
> written down as ⚪ ("not graded 🔴 on a page we could not read") and the re-read
> produced two correct grades. At xAI the same non-render was written down as
> "we read it and it does not say", and three cells went wrong. **The ⚪
> discipline is not politeness; it is the only thing that distinguishes "they
> are silent" from "we could not hear."** When a fetch returns a shell, a
> challenge page, or a redirect to a help-centre index, record the fetch — never
> the silence.

**Tooling that worked, after the browser and plain fetches failed:**
`curl -sL -A "<browser UA>"`. help.openai.com serves a Cloudflare interstitial to
the in-app browser but 200s to curl; x.ai and perplexity.ai 403 a bare fetch and
200 to curl. One Perplexity article returned a challenge page on the first curl
and the real article on a retry — **a challenge page is not a finding, retry
before concluding anything.** Check `<title>` before trusting a body: "Just a
moment…" is Cloudflare, not the provider.

**To re-verify a correction, use Wayback with the `id_` modifier** —
`https://web.archive.org/web/<timestamp>id_/<url>` returns the original bytes
(gzipped; `zlib.gunzipSync`). Without `id_` you get the rewritten page, and
archive.org 429s readily, so pace the requests. This is what separates "the
provider improved" from "we got it wrong", and the two demand opposite write-ups.

### Advertising is no longer a Microsoft-only finding

**"Microsoft is the only one disclosing that consumer AI prompts feed
advertising" was repeated in four places and is now false.** OpenAI began testing
ads in ChatGPT on 2026-02-09 (US, Free and Go), and discloses more detail than
Microsoft does: selection uses "the context and intent of your current
conversation"; with personalisation on, "Past chats and memory"; ads data
"retained for up to 30 days" after clearing. Perplexity advertises too. Corrected
in the Microsoft cell, the axis note, PROJECT-CONTEXT §7 and here. **A candidate
fifth column is scoped in PROJECT-CONTEXT open thread 19** — it needs the other
five providers read first, and "we don't show ads" stated plainly is a 🟢,
not a 🔴.

### What to re-check next

- **OpenAI `human_review` is still 🔴 and that should be tested, not assumed.**
  The Data Controls FAQ says Temporary Chats "may be reviewed only to monitor for
  abuse" — adjacent to the question but it does not say *human*, so the 🔴 held
  this pass. A dedicated help article may answer it outright.
- **xAI is "SpaceXAI LLC" in its own policy** (effective 2026-08-24), separate
  from X Corp. Row key deliberately unchanged — see PROJECT-CONTEXT open thread 20.
- **Perplexity's training opt-out is absent from its privacy notice** (verified:
  zero occurrences). If it ever appears there, the cell moves 🟡→🟢.

## E1h. The 2026-08-29 environmental re-read — xAI is not silent

**Ran the same stress test on the environmental matrix that broke the
data-practices axis: go at the cells that assert a total absence, because those
are the claims a failed fetch can fake.** Three rows were 🔴 across all six
dimensions. One of them should not have been.

### xAI publishes a Memphis site, and two cells were wrong about it

`x.ai/memphis` — with `/fact-v-fiction`, `/our-commitment`, `/info`, `/updates` —
is xAI's own publication about Colossus. It states:

- **Water:** the Colossus Water Recycle Plant, "$80 million", processing "up to
  13 million gallons of wastewater daily", "scheduled to begin operations in
  2026", projected to "conserve approximately 4.745 billion gallons of water
  annually".
- **Power:** temporary turbines "permanently removed from the Electrolux site";
  15 permanent turbines applied for January 2025, approved by the Shelby County
  Health Department 2 July 2025; likely only 12 needed, "eventually only be used
  for backup power"; grid supply being secured.
- **Emissions kit:** SoLoNOx dry-low-emissions plus selective catalytic
  reduction, NOx "to 2 ppm".
- **Grid spend:** $35M substation built, $20M committed for a second.

| Cell | Was | Now | Why |
|---|---|---|---|
| `replenishment` | 🔴 | 🟡 | old note: xAI "has not even asserted a goal" — it had, with a volume |
| `energy_source` | 🔴 | 🟡 | old note: "xAI itself still discloses no energy mix" — it discloses what powers the site |
| `site_level` | 🔴 | 🔴 | grade right, **note wrong**: it claimed "no corporate environmental disclosure of any kind" |
| `comparability` | 🔴 | 🔴 | grade right, note said "no figures published" — there are figures, just uncheckable ones |

> **The distinction to hold on to, because it is the whole job here: a company
> can publish a great deal about a site and still disclose nothing the column
> grades.** xAI publishes infrastructure specs, permits and a projected saving.
> It publishes no figure for the water or electricity Colossus actually uses, so
> `site_level` stays 🔴 — but on the right ground. **Write the note so it says
> what the company does publish.** A cell that reads "discloses nothing" to a
> reader who has just visited the company's page destroys the index's
> credibility faster than a wrong grade does.

**Why 🟡 and not 🟢 on the two that moved:** the water figure is a projection for
a plant that was not yet operating, conserving water *others* would have drawn is
not replenishing what the datacenter consumes, and none of it carries a
methodology, boundary, period or assurance. It is published on a page whose
stated purpose is rebutting critics. Company-published and uncheckable is 🟡 here,
not 🟢.

### Anthropic: the absence is now a measurement

Instead of "we looked and it is not there", the cell now carries a **full-text
census of the Transparency Hub** (121,341 chars): **water 0, energy 0, carbon 0,
emissions 0, climate 0, electricity 0, sustainability 0.** The only "environment"
hits are model deployment environments. **Re-run it whenever you re-verify —
a counted absence is checkable and an asserted one is not.** This is the cheapest
available fix for the failure mode in E1g.

### OpenAI held, and that matters

Every OpenAI environmental cell was re-checked against the Stargate Community
page and survived. Two refinements only, both grade-neutral: `replenishment` now
names the Wisconsin "$175M in local infrastructure upgrades and water restoration
projects" and says why a partner's spend is not a replenishment volume; and
`comparability` now carries a **second** uncheckable OpenAI comparison alongside
Altman's 0.32 ml — the Stargate page relays that "the water use at the Abilene
site in a year will be half as much as Abilene uses in a single day", attributed
to the city's mayor, expressed as a ratio to a quantity the reader also does not
know. **The careful wording from 2026-08-28 held up. Cells written carefully
survive re-reads; cells written with a flourish ("has not even asserted a goal")
are the ones that break.**

### A second date to watch, and it is voluntary

**2026-06-23 — the UN Secretary-General launched the AI Environmental
Transparency Initiative**, asking every major AI company to disclose full carbon,
water and land footprints and to power data centres with renewables by 2030. It
followed the UNU-INWEH report *Environmental Cost of Artificial Intelligence:
Carbon, Water and Land Footprints*. **As of 2026-08-29, no provider on this table
is named as having signed up**, and no grade moved because of it. Recorded in
`_meta.detail.note` alongside SB 253.

**Re-check both together:** SB 253 (Scope 1 + 2 from November 2026, Scope 3
2027) is the legal deadline; the UN initiative is the voluntary one, and the
interesting question is which providers answer a request that carries no penalty.
A provider signing up would be the first movement on this axis driven by
something other than a regulator.

### Still open on this axis

- **Google's per-prompt denominator — RESOLVED later the same day, see E1m.**
  There is no token count because the metric is a volume-weighted median across
  MODELS, not a median prompt: no denominator exists to publish. It is therefore
  **not** an error source the water model can close. Mistral's 400-token figure
  remains the only usable anchor.
- **Colocation landlords** (Equinix, NTT, CyrusOne) still unscored — a decision,
  not a gap.
- **The two flagged `datacenters.json` grading calls** (The Dalles, New Carlisle)
  are untouched and still flagged — see E2.

## E1i. `check-transparency.js` — the guard the 2026-08-29 pass earned

**Eight wrong cells across two axes, and every one passed `validate-site.js`.**
That script checks form; these were failures of substance. The new one gates the
promises the index makes about itself, and it is in CI on every PR.

```bash
node scripts/check-transparency.js
```

| Gate | Why it exists |
|---|---|
| Every cell has a note and a `source_url`, and an "N of N" claim in `_meta.methodology` must still be true | The page promised this while **36 of 42 cells were plain text** (E1d) |
| No maintainer-speak in rendered copy | A `water_note` saying "Do not flip this grade on the strength of that row" **went live** |
| `PROJECT-CONTEXT.md` grade tables match the JSON | Its pricing table disagreed in **nine cells** and its §10 caveat called two scored axes ⚪, for months |
| "N sites across N providers" matches `datacenters.json` | E3 — the count is typed into prose in two files and derived in neither |

**Both destructive checks were validated by replaying the real bug**, the way
`check-clock.js` was: checking out the tree from before 2026-08-29 fails on four
pricing rows plus the "env-only" caveat, and injecting the Microsoft PR's exact
sentence into a `water_note` fails the maintainer-speak scan. **A guard nobody has
seen fail is a guess.**

**Two deliberate softenings, so the output stays worth reading:** a ⚪ whose note
says it is deliberate (Microsoft's rate card) is not warned about, and a doc line
that *quotes* stale wording while correcting it is not flagged as asserting it.
Both were added because the script fired on its own documentation first.

⚠️ **It cannot tell you a grade is wrong.** Every error found on 2026-08-29 was a
cell that would still pass this script today, because being wrong about what a
provider published is not detectable from inside the repo. The script buys
consistency and honest copy; only a re-read against primary sources buys
correctness. It warns at 120 days since `_meta.last_verified` and that is the
most it can do.

## E1j. The `advertising` column (added 2026-08-29)

**Fifth dimension on the data-practices axis. It exists because the old finding
"Microsoft is the only one disclosing that consumer AI prompts feed advertising"
stopped being true and, once all eight were read, advertising turned out to
separate them better than expected.**

| Provider | | What it says |
|---|---|---|
| OpenAI | 🟢 | Ads on Free and Go from **2026-02-09** (US test). Names the signals: "the context and intent of your current conversation", plus "Past chats and memory" with personalisation on. Advertisers get aggregated data only; ads data kept "up to 30 days" after clearing; no ads near "personal health, mental health, or politics" |
| Google | 🟢 | Question is its own FAQ heading: "Your Gemini Apps chats are not being used to show you ads. If this changes, we will clearly communicate it to you." Discloses the carve-out — Gemini shopping-cart and Google Pay data **is** used "for personalization and ads" |
| DeepSeek | 🟢 | In capitals in the original: "WE DO NOT ENGAGE IN TARGETED ADVERTISING, 'SELL' PERSONAL DATA OR USE PERSONAL DATA FOR 'PROFILING'" |
| Mistral | 🟢 | "has not 'sold,' 'shared,' or engaged in 'targeted advertising' … in the preceding 12 months" — US-state-law framing and a backward look, not a forward commitment |
| Microsoft | 🟡 | Copilot "uses prompts and related data to provide and improve services, including relevant advertising" — but inside an omnibus statement where "advertising" appears **85 times** about every Microsoft product. No Copilot-specific signals, controls, retention or markets |
| Perplexity | 🟡 | Advertises; "we do not sell your personal data or send your queries, prompts, or conversation content to advertisers"; three ad opt-outs. Never says whether prompts *select* the ads it serves |
| xAI | 🟡 | FAQ: "We do not sell your data or share it with third parties for marketing or advertising purposes." Only the sharing half. The policy's one advertising reference is a **cookie** purpose |
| Anthropic | 🟡 | Only targeted advertising **of its own products**, with an opt-out. Never says whether conversations could feed ads — it appears to have no ads product, but the document does not say so |

> **THE FINDING IS A SUBSTITUTION, and it is the reason the column earns its
> place.** Only two providers answer the question a consumer actually has — *are
> my conversations used to choose the ads I see?* The other six answer an easier,
> adjacent one: whether they **sell or share** your data with advertisers. Those
> are different, and the difference favours the provider: a company can
> truthfully say it never sends your prompts to an advertiser while still reading
> those prompts to pick the ad it serves you itself. **When re-reading this
> column, check which question the sentence answers before grading it.**

**Grade disclosure, never conduct.** OpenAI runs the most invasive ads product
here and gets 🟢 for describing it precisely; DeepSeek and Mistral get 🟢 for
saying plainly that they do not advertise. **Do not grade a provider 🔴 for having
no ads** — "we don't do this", stated, is a disclosure. Reversing that turns the
axis into a conduct score, which this index does not do.

**What rots here, fast.** This is now the second-fastest-moving column on the
page after `allowance`. OpenAI went from no ads product to a documented one
inside a year, and its test was still expanding at the time of writing
("availability may continue to evolve"). Google's 🟢 rests on a promise about the
future — "if this changes, we will clearly communicate it" — so **that cell is a
commitment to re-check, not a settled fact.** Anthropic's 🟡 flips to 🟢 the day
its policy says outright that conversations are not used for advertising.

**Sourcing count moved 114 → 122** (42 environmental, 40 pricing, 40 data
practices). `_meta.methodology` states that number out loud and
`check-transparency.js` fails if it stops matching, so adding a dimension means
updating that sentence in the same commit — see E1i.

## E1k. The `allowance` column — 7 of 8 🔴, and Perplexity is the exception

**Perplexity publishes an absolute consumer allowance, and has since at least
2026-08-06.** From its help centre, "How Credits Work on Perplexity":

> **"Consumer Max plans start with 10,000 credits a month."**

It goes further than any other allowance disclosure on the table:

- a published conversion — **"Today, 100 credits equals $1"**
- typical consumption **by task class**: light 100–350 credits, complex 350–950,
  heavy 875–2,275, mega 2,400–9,800
- and the absence stated for the tier below: **"Consumer Pro plans do not start
  with a set monthly amount"**

**It is the only allowance figure on this axis a reader can do arithmetic with.**
🟡 not 🟢 because it bounds **Computer**, Perplexity's agent product, not the plan —
Pro Search on Max is still marketed as unlimited with no number.

### The other seven were read at source and confirmed 🔴

- **Google** — "Gemini Apps have compute-based usage limits … Your limit refreshes
  every 5 hours until you reach your weekly limit." No absolute number anywhere.
  Tiers are sold as 5× and 20× a base that is never quantified.
- **Anthropic** — "Think of this as your 'conversation budget' … affected by the
  length and complexity of your conversations, the features you use, which Claude
  model you're chatting with, and the effort level you've selected." No number.
  Its "usage credits" are pay-as-you-go top-ups **after** an unquantified limit,
  not an included allowance — a different thing from Perplexity's, and the
  distinction is what decides this column.
- **xAI** — the docs FAQ describes the mechanism in unusual detail (a **weekly**
  allowance, "shown as a percentage used", broken down by API / Build / Chat /
  Imagine / Voice, with a progress bar) and still publishes **no figure**. A
  percentage of an unstated total is not a disclosure. The closest any provider
  comes, and it still fails.

### How we got it wrong, because the lesson is the useful part

This column was checked by reading the three providers most likely to falsify it,
finding all three confirmed 🔴, and writing that up as a survival. **Three
confirmations of a universal claim is not a test of it.** The fourth provider was
never checked, and it was the one that disproved it.

> **Rule: to test "all N do X", the work is enumerating N, not collecting
> confirmations.** Stopping when the pattern is confirmed is how a universal claim
> survives contact with the evidence that disproves it. If a column is all one
> colour, check the cell you have least reason to suspect — it is carrying the
> whole claim.

Applied immediately afterwards to `human_review` (E1l), where enumerating five 🔴
cells instead of sampling them turned three of them.

### Pair this with `context_window`, because the two together say more

> **Providers are perfectly capable of quantifying a limit.** Three publish an
> exact context window — the size of ONE conversation (E1e). **Only one of eight
> will say how many conversations you get.** The capability is demonstrated and
> the allowance is still withheld, which is much harder to explain as technical
> difficulty than a blanket silence would have been.

### The cross-file work this triggered

The count lived in **six** places and every one was wrong:

| File | Was | Now |
|---|---|---|
| `plan-limits.json` `_meta.finding` | "exactly one absolute consumer usage figure … nothing else is quantified anywhere" | two figures, 25 of 27 not disclosed |
| `plan-limits.json` Perplexity Max | `not_disclosed`, "no figure published" | `disclosed`, with a `caps` entry |
| `pricing.html` inline `FALLBACK_LIMITS` | `not_disclosed` | `disclosed` + matching caps |
| `transparency-index.json` pricing note | "all eight publish no usage allowance" | seven of eight |
| `PROJECT-CONTEXT.md` §7 | "🔴 for all eight … 26 of 27" | seven of eight, 25 of 27 |
| `PROJECT-CONTEXT.md` §0 | "still 🔴 across all eight" | corrected in place |

⚠️ **`plan-limits.json` and `pricing.html` must move together** — `check-auditor.js`
asserts the inline fallback matches the file on `provenance`, cap `n`, `window`
and `scope_limited`. Changing one alone fails CI.

**The cap is `scope_limited: true`**, so `pricing.html` skips it when computing a
Ceiling (`if (c.scope_limited) continue;`). Deliberate: 10,000 credits bounds
Computer, and a ceiling derived from it would describe a fraction of what Max is
worth — the same reasoning as OpenAI Go's Thinking sub-limit. Both plans
consequently render "not disclosed" in the Ceiling column, which is verified
behaviour, not a bug.

**Edit `plan-limits.json` as TEXT, never via a JSON round-trip.** It uses a
hand-tuned compact style (`"p"` and `"m"` on one line, `value_models` inline) that
`JSON.stringify` destroys — it turns a three-field change into a 470-line diff.
Same trap as `transparency-index.json`, whose environmental matrix uses one-line
cells while the other two axes are expanded.

### Still open, and what to check first next time

**Google's per-plan context window (32k / 128k / 1M) is not in `plan-limits.json`
at all** — none of its five plans carries a `context_window`, where OpenAI's four
do. **`pricing.html`'s Ceiling column may therefore understate what Google
discloses.** Verified still open as of 2026-08-29.

Perplexity itself says its figure is unstable: **"credit pricing, task ranges, and
monthly allowances may change and can vary by promotion, region, or plan."** A
disclosure carrying its own expiry notice is the one to re-check first, and it is
the only 🟡 in this column.

## E1l. `human_review` enumerated — three of five 🔴 cells fell

**Ran E1k's rule on the next near-universal column: enumerate the set, do not
collect confirmations.** `human_review` was 🔴 for five of eight. Three were wrong.

| Provider | Was | Now | The sentence that decided it |
|---|---|---|---|
| Anthropic | 🔴 | 🟢 | "we automatically de-link your data from your user ID (like your email address) **before any review**" · "access is limited to a small number of personnel involved in model training" |
| OpenAI | 🔴 | 🟡 | "OpenAI uses automated systems and **human review** to identify harmful or policy-violating content" · "a trained team of experts to review these reports" |
| Microsoft | 🔴 | 🟡 | "our processing … involves both automated and **manual (human) methods** … we manually review some of the results against the underlying data" |
| DeepSeek | 🔴 | 🔴 | nothing, and no consumer help centre exists in which it could appear |
| Perplexity | 🔴 | 🔴 | nothing, across the notice **and all nine** Privacy & Data articles |

**Anthropic's article is titled with the question itself** — *"I would like to input
sensitive data into my chats with Claude. Who can view my conversations?"* — which
is the strongest form this disclosure takes anywhere on the table, and we had the
cell reading "no disclosure … in the consumer privacy policy or FAQ".

**The grading line that separates 🟢 from 🟡 here, and it is worth keeping:** 🟢
answers *who reads my conversations, and when*. 🟡 discloses that humans review
**something** without letting the reader place their own chats inside it — OpenAI
scopes it to reported content only; Microsoft states it for every Microsoft
product at once, so a Copilot user cannot tell if it means them.

**The claim that fell:** "Google is the only provider that tells consumers humans
read some conversations." Google is still best on this dimension, but for a
narrower reason — it is the only one tying review to a **retention period** (three
years, de-identified) and to the **state of your privacy settings** (review
continues with Activity off). Keep the narrow claim; the broad one was false.

### Running score for the 2026-08-29 pass

**Fourteen cells corrected across all three axes**, thirteen of them in the
provider's favour, and every one published before we graded it. The columns that
broke were the ones that looked most uniform: `human_review` (5×🔴 → 2×🔴),
`context_window` (7×🔴 → 5×🔴), `allowance` (8×🔴 → 7×🔴), and xAI's all-🔴
environmental row. **A column of one colour is not a finding until someone has
read every cell in it.**

## E1m. Google's "median prompt" — RESOLVED, and the answer is worse than a gap

**The open question was: Google publishes 0.24 Wh and 0.26 mL for the "median
Gemini Apps text prompt" but never says how many tokens that is, so the figure
cannot be turned into a rate. Recorded since 2026-08-28 as the largest error
source in the water model (F1c).**

**Resolved 2026-08-29 by reading Google's own methodology paper — arXiv
2508.15734, *Measuring the environmental impact of delivering AI at Google
Scale*. `curl` the PDF and `pdftotext -layout` it; it is 5 pages, not the 98-page
report.** The earlier pass searched this paper and concluded the token count "is
not there". That was right, and it missed why:

> **THERE IS NO DENOMINATOR BY CONSTRUCTION.** The paper defines the figure as:
> take the average energy per prompt **for each model**, rank the models by that
> value, build a cumulative distribution of prompts across that ranking, and find
> the model serving the 50th-percentile prompt. "The average energy/prompt is
> defined as the energy of the median Gemini Apps text prompt on that day."

**So "median" describes the MODEL, not the prompt.** The headline number is an
average over every prompt that one model served, and the size distribution of
those prompts is never characterised. **It cannot be converted to a per-token
rate even in principle** — there is nothing to divide by. A reader cannot apply
it to their own usage, and neither can we.

### What this changes for the water model (F1c)

**Stop treating Google's 0.26 mL as a fixed point our per-query model should
reconcile to.** It is not a measurement of a query of any particular size. Two
consequences:

1. Any residual between our modelled mL-per-query and Google's 0.26 mL is **not
   evidence our model is wrong**, because the two quantities are not the same
   kind of thing. Do not tune to close that gap.
2. **Mistral remains the only usable anchor** — its LCA states 45 mL and 1.14 g
   CO₂e for a **400-token response**, and Google's own paper cites it that way.
   A published figure with a stated token count is worth more than a bigger
   company's figure without one.

### Two things that are to Google's credit, and belong in the cell

- **It publishes the full methodology**, which is how this was diagnosable at all.
- **It reports both boundaries rather than the flattering one**: 0.10 Wh / 0.12 mL
  on the narrow "Existing Approach" against **0.24 Wh / 0.26 mL** on the
  "Comprehensive Approach" — a **2.4× spread from a single measurement** — and the
  figure Google quotes publicly is the **larger** one. That is the opposite of
  cherry-picking and is why the cell stays 🟡 rather than dropping to 🔴.

### The line worth quoting back

The same paper faults OpenAI's 0.34 Wh disclosure for providing **"no explanation
of the measurement boundary or methodology used to arrive at this number, making
it impossible to compare with other estimates"** — and notes that Mistral states
its figure per 400-token response. **Google identified the failure precisely, then
shipped a version of it.** That is the finding, and it is more useful than the
"no denominator" framing it replaces.

**Boundary spread is a re-usable comparability test.** Where a provider publishes
one number, ask what it would be under a narrower boundary. Google is the only
provider here that answers that question about itself.

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

### E3a. Stale superlatives — the class of bug counts don't cover (2026-08-30)

**Counts rot visibly. Superlatives rot silently, and two were found in one sweep.**
Both were prose asserting a ranking that the data had already contradicted, and in
both cases the *number* had been updated correctly while the *sentence it justified*
was not.

| Where | Claimed | Actually | Wrong since |
|---|---|---|---|
| `audit.html` DeepSeek caveat | "still the cheapest provider we track" | **third** — behind Mistral $0.262 and OpenAI $0.450, at $0.660 | 2026-08-24, the day the rise landed |
| `pricing.html` allowance callout | ChatGPT Go's is "the only absolute figure published anywhere" | **two** are disclosed; Perplexity Max publishes 10,000 credits/month | 2026-08-29, when Perplexity was added |

**The callout was contradicting itself inside one paragraph** — it computed
"2 have a usage cap the provider publishes" and then said "the only absolute figure"
two clauses later. **Both errors ran against a provider**, understating what DeepSeek
charges relative to rivals and understating what Perplexity discloses. That is the
direction E1g identifies as worst.

**The rule: when a number moves, re-run every ranking the old number justified.**
Recording the new value is half the job. Neither of these would have been caught by
re-reading the provider's page, because the provider had not changed anything — we had.

**Guards, both validated by reintroducing the bug:**
- `check-prices.js` §9 recomputes the per-provider price ranking and fails if the
  superlative returns, if DeepSeek stops being third, or if the `mistral < openai <
  deepseek` order the copy assumes flips.
- `check-prices.js` §10 fails if the callout calls an allowance "the only" while more
  than one plan is `disclosed`, if a disclosed plan lacks a nameable cap, or if the
  callout stops deriving its list from `plan-limits.json`. **The callout now enumerates
  the disclosed plans from the data, so that sentence cannot go stale again.**
- `test-auditor.js` asserts the DeepSeek caveat reaches `r.why` and says something
  true (65 → 69 checks). A string search proves the copy exists; only this proves it
  renders.

**Two traps worth remembering from writing those guards.** The first version of §10
failed on the clean file, because the explanatory comment describing the fix quoted
the superlative it had removed — **strip comments before grepping for prose.** And the
first version of the "still derives from data" check matched a string that appears
twice, so deleting the naming logic left it green; **anchor a guard on the construct
you actually care about, and verify it fails when you remove that construct, not a
lookalike.**

⚠️ **"8 providers" is now ambiguous and every instance needs reading before it is
changed.** Since 2026-08-29 `prices.json` carries **10** providers, but the
transparency index still grades **8** and the Auditor still covers **5**. Those are
now three different numbers that used to be two, and most existing prose saying
"eight providers" is about the *index*, where it remains correct. **Do not
bulk-replace.** The counts that did move: `prices.json` → `api` (7→10 in FRESHNESS
A1) and the pricing page's own ticker, which is computed live and needs no edit.

## E4. The two scales are deliberate

The page grades **public knowability** on a 4-state scale and nests the older
**disclosure matrix** beneath it. They are different questions and they will
disagree. **Don't "reconcile" xAI's 🟡-vs-🔴** — it's documented in
`_meta.detail.note`.

---

# F. Water intensity

## F1. `extension/water.json`

**Re-sourced 2026-08-28.** `_tiers_last_sourced` is now `2026-08`; `_last_updated`
tracks the file, `_tiers_last_sourced` tracks the research behind the numbers. The
split exists (since 2026-08-24) so routine model additions can't make the intensity
estimates look freshly verified. **Don't bump `_tiers_last_sourced` without actually
re-reading the primary sources** — that field is the whole point.

**What the 2026-08 re-source found: the anchors did not move.** Google's 0.26 ml per
median Gemini Apps text prompt and Altman's 0.32 ml per ChatGPT query are still the
only first-party per-prompt figures in existence, and **nobody publishes water per
token**. Verified against primary sources, not coverage: arXiv:2508.15734 is still
v1 (21 Aug 2025, never revised); Google's 2026 Environmental Report repeats the same
May-2025 measurement (independently confirmed by `transparency-index.json`'s direct
read on 2026-08-25); Anthropic still discloses nothing. Li et al. **has** since been
peer-reviewed — Communications of the ACM 68(7):54-63, July 2025, doi 10.1145/3724499
— with unchanged numbers; we had only ever cited the preprint, and now cite both.

**Six errors found in how the file described its own numbers.** None changed a tier
value; all six changed what we were *claiming*:

| Was | Now | Why it mattered |
|---|---|---|
| Google's 0.26 ml labelled "scope 1+2 on-site" | scope-1 on-site cooling only | Google's boundary excludes electricity-generation water — the exact gap the academic scope exists to fill. Wrong in the direction that flatters the provider. |
| "~500ml per 20-50 queries = ~10-25ml per query" | 10–50 ml per response | Halved the top of Li et al.'s own stated range. |
| "10-33x more water-efficient" | ~8.5× like-for-like, on-site | 33× is Google's **energy** cut and 44× is **carbon**; neither is water. `transparency-index.json` already labelled them correctly — the extension didn't. |
| "Varies 10-25x by location" | ~5× (Li et al.'s own spread) | Unsourceable; appears to be the 10–25 ml-per-query figure restated as a multiplier. |
| Academic tier "derived" as per-query ÷ 500 | stated as a judgement, with its bracket | 16.9 ml ÷ 500 = 0.0338, not the 0.020 in the file. **A reader checking our arithmetic could not reproduce our number from our stated method.** |
| `moduledge.com` in `_sources` (Apr 2026) | removed, with reason recorded | ModulEdge s.r.o. sells modular data centres and waterless cooling. A vendor blog, carrying the newest date in the list, so it read as our most current evidence. |

**Two of these were live in the UI** — `extension/sidepanel.html` repeated the scope
error and the "10–25×". Both fixed there in the same commit. **If you correct a
figure in `water.json`, grep `sidepanel.html` for it too.**

**`_open_questions` — needs Rory, don't resolve silently** (both researched in a second pass the same day — see **F1a**):

1. **`token_divisor`** — the 500-token divisor converting per-query anchors to
   per-token is unsourced, and *every* figure in the file scales inversely with it.
   Google's anchor is per prompt; Li et al.'s is per 150–300 word output (~200–400
   tokens); the extension multiplies by input+output combined.
2. **`academic_tier_value`** — 0.020 ml/token sits in a defensible 0.004–0.0338
   bracket. Moving it shifts user-facing full-scope numbers up to ~1.7×. Left alone
   because no new evidence justified moving it.

**The silent failure:** a model priced in `prices.json` with no `water.json` tier
renders **no water figure at all**, with no error. That gap had accumulated across
nine models before it was caught.

**Tiers:** `large` / `medium` / `small` / `tiny`, each with a conservative and an
academic ml-per-token figure. Adding an untracked model means **choosing** a tier —
that's a judgement about the model's size, and it's part of why some models are
deliberately untracked (A3).

**Goes stale when:** a provider publishes real per-token water data (nobody has
yet), or the underlying academic estimates are revised. Next re-source should
re-check the same four: arXiv:2508.15734 for a v2, Google's next Environmental
Report, Anthropic for any first disclosure, and Li et al. for a revision.

**Guard:** `check-prices.js` — "priced, no water tier" is its first check. Nothing
guards the *figures* or their descriptions; only a re-source like this catches those.

### F1a. The two open questions, researched (2026-08-28, second pass)

Both were chased down the same day. **There is real evidence on both, and it points at
something bigger than either question: the constant-ml-per-token model is structurally
wrong, not merely mis-calibrated.** Numbers deliberately unchanged — this is a design
decision, not a data refresh.

**The divisor.** 500 has evidence against it now:

- **Li et al.'s own "medium-sized request"** — the thing the 16.9 ml figure describes —
  is ~800 words in plus 150–300 words out, i.e. **~1,300 tokens**. We divided the
  academic anchor by a number ~2.6× too small.
- **Google publishes no token count** for its median Gemini prompt (searched the paper
  directly), so the conservative divisor stays genuinely unsourceable.
- **OpenRouter's 100-trillion-token study** (arXiv:2601.10088) measures exactly what the
  extension multiplies — prompt+completion per request — at **over 5,400 by late 2025**,
  up from under 2,000 in late 2023. *Caveat: router/API traffic, skewed toward developer
  and agentic workloads; a proxy for chat usage, not a measurement of it.*

**The academic tier.** `Jegham et al.` (arXiv:2505.09598) answers this directly, and **we
were already citing it without using it.** It gives per-query energy for 30 models at three
*known* token configs, plus a water equation — `Water = E × PUE × WUE_site + E × WUE_source`
— that is precisely our conservative/academic split. Reconstructing water from its Table 4
energies and Table 1 multipliers **reproduces four figures the paper states in prose**
(219 mL vs "over 200", 34.7 vs "only 34", 2.4 and 3.9 vs "under 4"), so the reconstruction
holds. Measured against it, the shipped tiers are roughly right at short queries and
overestimate progressively as queries lengthen:

| Full scope, EcoMeter ÷ Jegham | 400 tok | 2,000 tok | 11,500 tok |
|---|---|---|---|
| o3 (large) | 1.5× over | 1.7× over | 4.0× over |
| GPT-4o (medium) | 2.6× over | 4.6× over | 11.1× over |
| Claude-3.7 Sonnet (medium) | 1.0× | 1.6× over | 5.0× over |
| GPT-4.1 nano (tiny) | 2.1× over | 3.7× over | 14.8× over |

**Why: per-token water isn't constant.** A 28× rise in tokens (400 → 11,500) raises energy
only ~5×, because latency-to-first-token, prefill and idle capacity don't scale with length.
A single ml/token figure can be right at one query size and nowhere else — **picking a better
divisor only moves where it's right.** This is the same direction and shape as the
prompt-caching bias already disclosed in `sidepanel.html` ("we overestimate, and the gap
widens as a chat gets longer"), from an independent cause, and it is **currently undisclosed**.

**Bonus: the "~40×" full-scope multiplier is outside the evidence range.** We ship 38×
(0.020/0.00052). Real infrastructure implies **Google 5.0×**, **Azure/OpenAI 13.9×**,
**AWS/Anthropic 25.9×**. It also isn't a constant: the *better* a provider's on-site cooling,
the *higher* its multiplier, because scope-2 stays put while scope-1 shrinks. A single global
multiplier is wrong in kind, not just in value.

**Three options, all of which move user-facing numbers.** Rory chose **(2)** — see **F1b** for what shipped:

1. Keep the linear model, re-centre the divisor on a defensible query size. Cheapest; still wrong at both ends.
2. Make water a function of query size, the way the cost model already handles context replay. Most accurate, most work.
3. Keep the numbers and disclose the bias, as the caching disclaimer already does.

Working scripts for the whole derivation are in the session scratchpad (`jegham-per-token.js`,
`error-profile.js`) — both are pure arithmetic over the two papers' published tables and can be
re-run against a newer benchmark.

### F1b. The query-size water model (shipped 2026-08-28)

**Option 2 from F1a was taken: water is now a function of query size.** The flat
ml-per-token constants are gone.

```
water_ml_per_request = base_ml_per_request
                     + ml_per_input_token  * input_tokens
                     + ml_per_output_token * output_tokens
```

per tier, per scope, summed over turns. **Deliberately the same shape as the cost
model** — fixed per-request cost, cheap input, expensive output — because the
physics matches: latency-to-first-token and idle capacity don't scale with length,
prefill is parallel and cheap, decode is sequential and bandwidth-bound.

**Fitted, not chosen.** `scripts/derive-water-model.js` fits the parameters to
Jegham et al. (arXiv:2505.09598) — 30 models at three known token configurations,
with their water equation `E × PUE × WUE_site + E × WUE_source`, which *is* our
conservative/academic split. Tier parameters are fitted across all models in a tier
at once, constrained non-negative, minimising relative error. **Re-run the script;
don't hand-edit `_model`.**

- An exact 3-point-per-model solve **overfits** — it returns negative bases and
  negative input rates, which would show water *falling* as you type. Hence the
  pooled, constrained fit. RMS relative error 17–43%; still order-of-magnitude.
- **Independent cross-check the fit was not tuned to:** the medium tier predicts
  **0.22 ml** for a 1k-in/300-out prompt against Google's measured **0.26 ml**
  (0.86×) — different provider, fleet, WUE and method.
- The full-scope multiplier is now **14–25×**, inside the range real infrastructure
  implies (Azure 13.9×, AWS 25.9×). The old shipped value was 38×, above everything.

**Water and cost make opposite caching assumptions, on purpose.** Cost uses the
replayed transcript, because billing really does re-charge the whole history each
turn. Water uses **only the visible new input**, because compute does *not*
re-spend a cached prefix — the KV cache is reused. Feeding the replayed figure into
water put a 20-turn chat at **1.29 ml per request against Google's measured 0.26**,
~5× too high. Residual risk runs the other way: where a provider doesn't cache, we
now understate prefill.

**Effect on users:** short turns barely move; long sessions fall substantially
(~4× on a 40k/10k session, full scope). The panel was overestimating long chats.

> **`_tier_inversion` — a live finding, shipped rather than smoothed.** The fitted
> output rates are **not monotonic**: `small` (6.32e-4 / 9.02e-3) sits above
> `medium` (4.81e-4 / 6.96e-3). In Jegham's data Claude-3.5 Haiku draws 8.010 Wh on
> a long query — more than Claude-3.7 Sonnet (5.671) and far more than GPT-4o
> (2.875) — and runs on AWS, whose off-site WUE is higher than Azure's. That matches
> the paper's own headline: infrastructure outweighs architecture. **It undercuts the
> premise of size-based tiers.** Deliberately *not* guarded — a monotonicity check
> would only force the data to be quiet. **Open for Rory:** accept non-monotonic
> tiers, or drop size tiers for per-model/per-host figures. **Rory took the second: see F1b was superseded within the hour by F1c**, which separates energy from infrastructure and removes the inversion entirely.

**Still true, and recorded in `_remaining_caveats`:** one benchmark, itself modelled
(inferred hardware, published multipliers, API latency) rather than metered; wide
tier spreads; and Google/xAI models assigned tiers by analogy since Jegham covers
OpenAI, Anthropic, Meta and DeepSeek only.

**Guards:** `check-prices.js` gained six water-model checks (shape, both scopes, all
four tiers, non-negative finite parameters, known tier names, academic > conservative)
— **each verified by injecting its fault**. `test-water-model.js` is new: it lifts
`waterForRequest` out of `sidepanel.js` rather than restating the formula, and pins
that the parameters still reproduce the source data, that the curve stays sublinear
and monotonic, that the Google cross-check holds, and that the specific regression
this replaced (4.0× over on a long query) stays fixed.

### F1c. Energy × infrastructure — the model that fits all the published data (2026-08-28)

**F1b's tier inversion wasn't a wart to accept; it was the model telling us size was
doing two jobs.** Water is now:

```
water_ml = energy_wh(model, in, out)  ×  water_rate(host, scope)
```

Model efficiency and infrastructure are **separated, because the evidence separates
them**: the same DeepSeek model uses **7–10× more water on DeepSeek's own data
centres than on Azure**. Once that's explicit, a "small" model on thirsty
infrastructure beating a "medium" one on efficient infrastructure is just a fact,
not a paradox — and adding a model and re-sourcing a host's WUE become independent
jobs. `_tier_inversion_resolved` keeps the history.

**Two corrections to how the water rate is computed**, both from primary definitions:

1. **WUE is defined per unit of IT energy** (The Green Grid), and Google applies it
   that way — `Water/prompt = (E_total − E_overhead) × WUE`, **no PUE multiplier**.
   Off-site generation water *does* carry PUE, since it tracks grid draw. Jegham has
   this the other way round. We follow the operator definition:
   `conservative = wh × wue_site`, `academic = wh × (wue_site + pue × wue_source)`.
2. **Host figures come from our own index, not the paper.** `transparency-index.json`
   has directly-read 2025 numbers that are newer: **AWS WUE 0.12 (2025), not 0.18
   (2023)**; Microsoft 0.27, not 0.30. Using the paper's would have overstated every
   AWS-hosted model by ~50%.

Energy — and *only* energy — comes from Jegham's Table 4, which is a measurement of
models, independent of anyone's cooling, so it survives host figures being re-sourced.

**Every published per-prompt figure now either feeds the model or tests it:**

| Published figure | Role | Result |
|---|---|---|
| Google 0.26 mL/prompt (arXiv:2508.15734) | **anchors Gemini's energy** | 0.26 mL ⇒ 0.226 Wh IT. Only first-party per-prompt energy anyone publishes |
| Jegham Table 4, 30 models | **fits every energy curve** | worst per-model error 29% |
| AWS / Microsoft / Google / Meta PUE + WUE | **sets the water rates** | all directly read, dated, sourced |
| Li et al. 16.9 mL (GPT-3, 2023) | validation | we give 9.32 mL — lower, as 2025 models should be |
| Altman 0.32 mL/query | validation | we give 0.11–0.15 mL for GPT-4o. **His figure has no methodology**; the gap is his to explain |
| Mistral 45 mL/400 tokens (LCA) | validation | we give ~8.7 mL **operational** — the ~5× gap is training + embodied hardware |

Anchoring Gemini mattered: on a cross-vendor class average it came out **2.3× over
Google's own measurement**. It now brackets it.

**16 of 68 models sit on a curve fitted to that exact model; 52 use a class
fallback.** Per-model fits carry ≤29% error, class fallbacks 39–74% — so a class
figure is a genuinely weaker claim, and **the panel says which on hover**. Only exact
id matches get a measured curve: a 2026 Sonnet does not borrow Claude-3.5 Sonnet's
numbers.

> **The one number that would most improve this model is one Google already has.**
> Gemini is anchored on their measurement, but they don't publish the token count of
> their median prompt, so mapping it to the 100-in/300-out config is our assumption.

**Still true:** all energy rests on one benchmark, itself modelled rather than
metered. xAI and Mistral publish no PUE or WUE and use the median of the four hosts
that do. Google publishes no fleet-wide WUE either. **Both scopes are operational
only** — no training amortisation, no embodied hardware; Mistral's LCA says that's a
~5× gap we don't model.

**Guards:** `check-prices.js` carries **ten** water checks (host numbers finite and
non-negative, every host sourced, `wue_source > 0`, curve shapes, all four class
fallbacks, non-zero output cost, and the model→host / model→curve joins) — **each
verified by injecting its fault, 10/10 caught**. `test-water-model.js` lifts
`waterForRequest` from `sidepanel.js` and pins the energy fit against Table 4, the
host rates against their sources, all six validation figures above, sublinearity,
monotonicity, and both historical regressions.

**Re-run `node scripts/derive-water-model.js --write` rather than hand-editing
`_hosts` or `_energy`.** It is idempotent and re-migrates the model entries.

### F1d. Two hosts added 2026-08-29 for the Chinese labs — one first-party, one not

**`alibaba`: PUE 1.187 and WUE 1.198 L/kWh, both FIRST-PARTY.** Alibaba Group's
**2026** ESG Report (PDF on `alibabagroup.com`, text-extracted 2026-08-29): PUE 1.187
across self-built data centres, down from 1.190 in FY2025; WUE published as a
three-year series — **FY2024 1.205, FY2025 1.144, FY2026 1.198**; clean electricity
73.6%. Only `wue_source` remains inferred (Jegham's off-site generation figure, which
Alibaba does not publish), so the entry is still mixed provenance but far less so.

**NOTABLE, and it belongs in the transparency index if Alibaba ever reaches it:
Alibaba publishes a fleet-wide WUE series for its self-built data centres and Google
does not.** The `google` host note in the same file records that gap. A Chinese
provider out-disclosing Google on a specific environmental metric is the kind of
finding that only survives if we keep grading the axis and not the flag.

#### ⚠️ This entry was WRONG for about an hour, and the failure is the lesson

The first version said **PUE 1.200 from the FY2024 report** and **"no Alibaba WUE
figure found"**, inheriting `china_avg`'s 1.2. **All three parts were wrong**: the
current PUE is 1.187, Alibaba does publish a WUE, and clean electricity is 73.6% not
56%.

**Cause: I stopped at a search snippet about a two-year-old report instead of opening
the ESG resource page, where the current PDF is two clicks away.** An asserted absence
resting on an inadequate search — **the exact failure this file documents at E1g, and
committed in the same change that cites it.** What makes it worse is that the entry
*itself* flagged "a newer ESG report almost certainly exists and was not looked for",
so the gap was known and the wording still described Alibaba's silence rather than my
search.

**`wue_site` barely moved (1.2 → 1.198). The number was never the problem; the
provenance claim was.** In a project whose product is knowing what is published and
what is guessed, a right number with a wrong label is still a defect.

**The rule, stated so it is reusable:** when a provider publishes annual reports, find
the *reports index* and take the newest. Never conclude "they don't publish X" from a
search snippet, a blog summary, or a single JS-rendered marketing page. `pdftotext` on
the actual PDF took one command and settled all three figures at once.

**`china_avg`: PUE 1.27, INFERRED**, used for Z.ai and Moonshot. Numerically identical
to the existing `deepseek` host — both are Jegham et al.'s average of the thirty most
efficient Chinese data centres — and deliberately kept as a separate key so DeepSeek's
published figures do not move. **The two could be merged; that is a judgement call for
Rory, not a silent tidy-up.**

**Its `note` is worded as a statement about us, not about them:** *we did not locate a
PUE or WUE disclosure for Z.ai or Moonshot.* That is not the same claim as "they
publish nothing", and only one of the two is supported by what was actually done. If
either lab ever reaches the transparency index, that cell starts at ⚪, not 🔴.

---

# G. Extension mechanics

## G0. ⛔ BLOCKER — the Chinese models cannot go in the extension picker yet

**This is a tokenizer problem, not a data problem, and it is the reason the
2026-08-29 work stopped at the price tracker.** Anyone tempted to "finish the job"
by adding Qwen/GLM/Kimi to `MODEL_CATALOG` must read this first.

`getEncodingForModel()` in `sidepanel.js` has no branch for any of them. Verified by
lifting the function and running it:

| key | encoding it gets |
|---|---|
| `qwen3.8-max`, `qwen3.8-27b` | `char-ratio` |
| `glm-5.3`, `glm-5.3-flash` | `char-ratio` |
| `kimi-k3`, `kimi-k2.7-code` | `char-ratio` |
| `mimo-v2.5`, `hy3` (if ever added) | `char-ratio` |
| `deepseek-v4-flash` | `cl100k_base` (explicit branch) |

**`char-ratio` divides prose by 4.0 characters per token. That is an English ratio,
and these are Chinese-first models.**

### Measured, 2026-08-30 — not asserted

Bundled `cl100k` vs `charRatioEstimate()`, both lifted from the shipped extension:

| sample | chars | cl100k | char-ratio | error |
|---|---|---|---|---|
| English prose | 184 | 33 | 46 | 1.4× **over**count |
| **Chinese prose** | 62 | 61 | 16 | **3.8× UNDER**count |
| Mixed CN/EN | 52 | 22 | 13 | 1.7× undercount |

**⚠️ Read the caveat before quoting 3.8×.** cl100k is *not* Qwen's tokenizer — Qwen,
GLM and Kimi all ship CJK-optimised vocabularies and will produce **fewer** tokens on
Chinese than cl100k does. So 3.8× is an **upper bound** on the error, measured against
the wrong tokenizer because it is the one we have. The true figure against Qwen's own
BPE is unmeasured. It is still certainly a large undercount, because no CJK tokenizer
comes close to 4 chars/token.

### Why this is disqualifying rather than merely imprecise

**It fails in the direction that flatters the provider.** A Qwen user typing Chinese
would see roughly a third of their real tokens, so a third of the real cost, water and
energy. The whole mission is closing exactly that asymmetry — shipping a counter that
under-reports Chinese usage by multiples would make the tool lie on the provider's
side, for precisely the users most likely to type Chinese.

Note the English row fails the *safe* way (overcount). This is not a general accuracy
complaint about `char-ratio`; it is specific to CJK.

### What unblocking actually needs

1. **Bundle real tokenizers.** `tokenizer_hf.js` and `scripts/fetch-tokenizers.js`
   already exist for this, but `fetch-tokenizers.js` knows **only `deepseek`** and
   `extension/tokenizers/` contains **nothing but a README**. Add Qwen / GLM / Kimi
   vocabularies there.
2. **Watch the bundle size.** `tokenizer_o200k.js` is 2.7MB and `cl100k` is 1.0MB
   against a ~1.6MB zip today. Three more full vocabularies would dominate the
   package — check whether the HF path can load them lazily rather than bundling.
3. **Re-run `scripts/calibrate-tokenizer.js`** — its corpus is built from this repo
   and is therefore all English. **Its measured ±10.5% band does not apply to CJK
   text and should not be shown next to a Chinese token count.**
4. Only then add a `getEncodingForModel` branch and the `MODEL_CATALOG` entries.

**Until all four are done, keep these models out of the picker.** They are correctly
absent today — `grep -c "qwen\|glm-\|kimi" extension/sidepanel.js` returns 0.

**`content.js` is a second, independent blocker:** its `PLATFORMS` list covers 12
hosts and **none is Chinese** — no `chat.qwen.ai`, `kimi.com`, or `chat.z.ai`. Adding
them means new DOM selectors, which G1 below calls the biggest unguarded risk in the
project.

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

## H0. Building the package — `scripts/build-extension.js`

**Packaging was a manual step until 2026-08-28**, which is why the v6.13 zip shipped
whatever happened to be sitting in the folder. It is now one command:

```
node scripts/build-extension.js          # build + verify
node scripts/build-extension.js --check  # verify only, writes nothing
```

It writes `ecometer-ai-v<version>.zip` at the repo root (gitignored — packages are
build artifacts, not history) and **refuses to build** if any of these fail:

- `prices.json._meta.version` ≠ `manifest.json` version
- `manifest.description` names any of the nine products, exceeds 132 chars, or
  doesn't appear verbatim in `STORE-LISTING.md` — **this field IS the store's short
  description, and it is what got v6.12 rejected**
- a required file is missing, or `STORE-*.md` leaks into the package

**Why it writes the zip itself:** there is no `zip` binary on this machine, and
PowerShell's `Compress-Archive` can emit entry names with **backslashes**, which
Chrome rejects. The script deflates through `zlib` and writes forward slashes.
Zero dependencies, like everything else here.

**Verify a build independently** — don't trust the writer just because it ran:

```
powershell -c "Add-Type -AssemblyName System.IO.Compression.FileSystem; \
  ([System.IO.Compression.ZipFile]::OpenRead('ecometer-ai-v6.14.zip')).Entries.Count"
```

v6.14 was checked this way: 22 entries, **zero backslash separators**, manifest reads
6.14 inside the archive, and all 22 files extract byte-identical to `extension/`.

**`tokenizers/.gitignore` and `tokenizers/README.md` ship on purpose.** `tokenizer_hf.js`
references the `tokenizers/` path, and a zip cannot carry an empty directory — those two
files are what keep it present. Don't "tidy" them out without checking that.

**The one thing the script cannot do is the smoke test.** Load-unpacked at the exact
version being uploaded is still manual, and it is the check that catches what static
verification can't.

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

**v6.14 uploaded 2026-08-28**, built by `scripts/build-extension.js` (H0) and
verified with an independent implementation: 22 entries, zero backslash
separators, manifest reading 6.14 inside the zip, every file byte-identical to
`extension/`. It ships the rebuilt water model (F1a–F1c), so **users' water
figures move** — `water.json` `_model_history` explains why, in order.
**Awaiting review** — watch for a repeat of the Yellow Argon listing rejection,
and expect permission re-review for `generativelanguage.googleapis.com`
regardless.

**v6.13 (2026-08-24) appears to have cleared review**, because the store blocks a
new upload while a prior version is pending and 6.14 went up. Its verdict was
never recorded here before it was superseded — confirm in the dashboard rather
than assuming. It was the first build carrying the corrected cost model.

For the record, the store had been serving a pre-2026-08-02 build with billed
input charged ~2×, Claude image tokens ~51×, a false "±8%" band, stale prices, no
GPT-5.6 family, and export v1.

> ⚠️ **A shipped build freezes its prices, so this entry does not stay closed.**
> The extension reads `chrome.runtime.getURL('prices.json')` — the bundled copy —
> and never fetches remotely. Whatever shipped is what users see until the next
> upload. **`gemini-3.6-flash` and `gemini-3.7-flash` are on a promotional rate
> until 2026-12-31** (A6); if 6.14 is still live in January it understates Gemini
> cost by 2×, which is the harmful direction. `check-prices.js` catches this in the
> repo and cannot catch it in the store. **The real fix is exercising the weekly
> `publish.yml` cadence rather than shipping once every few months.**

**Every pass should re-ask:** what's the store status (dashboard → the item →
status + version), and has the fix gone up?

**Local state:** `manifest.json` and `prices.json._meta.version` agree at **6.14**
(`check-prices.js` enforces the match, and `build-extension.js` refuses to package
if they drift — bump both or neither).

**What a future pass should ask here**, in order:

| Question | Why it matters |
|---|---|
| Did 6.14 clear review, and did 6.13 ever publish? | If rejected on listing copy again, the fixed text is already in `STORE-LISTING.md` — don't recompose it. |
| Is it *submitted*, or a saved draft? | A draft sits in the dashboard forever and never reaches review. |
| How old are the shipped prices? | They're frozen at build time. Compare the live build's version against `prices.json._meta.last_updated`. |

Also worth asking after any submission: did it use the **old** description? If
pasted from the dashboard's existing text rather than `STORE-LISTING.md`, it
carries the nine-platform list and another Yellow Argon rejection is near-certain
regardless of code.

**Windows build traps are in `PROJECT-CONTEXT.md` §11** — there are two, and the
dangerous one *uploads successfully* and just ships broken icons and fonts. The
verified 6.14 build checked: 22 entries, manifest at root, no backslash
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
node scripts/check-transparency.js && node scripts/check-prices.js && node scripts/check-auditor.js && node scripts/test-auditor.js && node scripts/check-clock.js && node scripts/test-cost-model.js && node scripts/calibrate-tokenizer.js && node scripts/validate-site.js
```

| Script | Covers | Doesn't cover |
|---|---|---|
| `check-prices.js` | 5 files agree on every price; water-tier parity; displayed-but-unpriced models; (2026-08-28) the water `_model` shape, both scopes, all four tiers, non-negative parameters, known tier names, ten water checks incl. host sourcing and the model→host/model→curve joins | **Never opens `audit.html`**; not the water *values* — that is `test-water-model.js` |
| `check-auditor.js` | `audit.html` + `pricing.html`'s `FALLBACK_LIMITS`, against `prices.json` / `plan-limits.json` / `student-access.json` / `transparency-index.json`; plus (2026-08-25) every paid tier being selectable, feature labels, the practices join, the frontier examples, no hand-typed dates in the student copy, expired `claim_by`, and the extension button names | `pricing.html` prices — that's `check-prices.js` |
| `test-auditor.js` | Sweeps all 56,250 answer combinations + the EcoMeter import | Whether the underlying data is *true* |
| `check-clock.js` | Clock fallback parity; capex/energy levels vs published totals; one-company share bound; hardcoded anchor date | Counters with no authoritative total — by design, not omission |
| `test-cost-model.js` | 44 assertions: billed input, image tokens, long-context tiers, export v2 | — |
| `test-water-model.js` | Water model: energy fit vs Jegham Table 4, host rates vs their sources, six published-figure validations, sublinearity, monotonicity, both historical regressions | Whether the benchmark itself is right |
| `derive-water-model.js` | Fits `water.json` `_energy` + writes `_hosts`, and re-migrates all 68 model entries (`--write`, idempotent) | Not a guard — run it when the benchmark or a host’s WUE changes |
| `calibrate-tokenizer.js` | Measures the estimator; fails if the UI band is optimistic | The two guessed bands (G3) |
| `build-extension.js` | Packages extension/ for the store; blocks on version mismatch, brand names in the short description, missing files | Not a guard — and it cannot smoke-test |
| `validate-site.js` | HTML/JSON well-formedness, page references | **Plausibility of any number** |
| `check-transparency.js` | (2026-08-29) The Transparency Index's promises about ITSELF: every grade has a note and a `source_url` (114/114) and any "N of N" claim in `_meta.methodology` still holds; no maintainer-speak in copy that renders (cell notes, `water_note`s); the grade tables in `PROJECT-CONTEXT.md` match the JSON; hardcoded "N sites across N providers" counts match `datacenters.json` | **Whether a grade is RIGHT.** No script can read a provider's policy for you — that is what a re-read is for. It warns once `_meta.last_verified` passes 120 days and stops there |

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
