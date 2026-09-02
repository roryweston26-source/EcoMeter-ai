# Measuring Claude's usage limits

_A protocol for putting a real number on the one figure Anthropic meters and won't publish. Written 2026-09-01. Read `FRESHNESS.md` **B6** and **B9** for the surrounding context._

---

## Why this is worth doing

Anthropic **meters** the weekly cap precisely enough to render a live percentage against it, several times a session. It never states the denominator. You can watch yourself reach 43% of something you will never be told the size of.

Two facts make that gap closable **without any further disclosure from Anthropic**:

1. **The product gives you a percentage.** Settings → Usage shows progress bars for the five-hour session limit and the weekly limit. Documented in *Usage limit best practices*, step 7.
2. **Anthropic prices the overage.** "Usage credits are billed at standard API rates" — the same rates `extension/prices.json` already carries.

So: percentage + token count + published rate = **the weekly cap in dollars**, in the exact unit every other figure on the site uses. That would be the first non-Z.ai Ceiling figure on `pricing.html`.

**The second prize is bigger than the first.** The weekly-to-five-hour *ratio* is what every other provider's weekly estimate currently rests on, and today that rests entirely on Z.ai's published 5×. A measured Anthropic ratio is a second anchor from a different company, and it improves the OpenAI, Google and Perplexity estimates too — none of which we can measure directly.

---

## What we already have

From a Claude Pro account, 2026-09-01, two readings:

| Reading | Context | 5-hour | Weekly |
|---|---|---|---|
| A | 496.7k / 1M (50%) | 25%, resets in 3h54m | 43%, resets Sat 02:00 |
| B | 532.9k / 1M (53%) | 18%, resets in 4h47m | **2%**, resets Sat 02:00 |

Reading B is on a **fresh weekly window** — the ideal baseline.

### A first ratio, and why it is provisional

At reading B the same recent usage registers as **18% of the five-hour cap and 2% of the weekly**. If everything consumed this week sits inside the current five-hour window, then

```
weekly ÷ five-hour = 18 ÷ 2 = 9×
```

**Range 7.2× – 12×**, because a 2% reading carries ±0.5pp, which is ±25%.

Two reasons not to bank it yet:

- **It assumes no usage earlier in the week.** Plausible right after a Saturday reset, unverified.
- **2% is the worst possible place to measure from.** Precision improves in direct proportion to the gap.

For comparison: **Z.ai publishes 5×**. If Anthropic really is ~9×, the weekly is exhausted by **9 maxed five-hour windows — about 45 hours of flat-out use.**

### One thing reading B already overturns

At reading B the burn rate was **1.38%/min of the five-hour cap** — 18% in 13 minutes, which would exhaust that window in **72 minutes**. So for this usage pattern the five-hour cap is a real constraint, not the speed bump it is for most people. Long contexts (500k+) and Opus at Max effort do that. Worth keeping: the general claim "the weekly always binds" holds for ordinary chat, **not** for this.

---

## The protocol

### What you need

- The Claude usage panel (Settings → Usage, or the popover in the screenshots)
- **An EcoMeter export** — it counts your real tokens locally, which is the instrument this needs
- Somewhere to paste four numbers

### Rules that decide whether the result is worth anything

1. **One model only** between readings. The bar says "Weekly · **all models**", so a Sonnet/Opus mix pools things that almost certainly cost different amounts per token, and the result will not decompose. Reading B was Opus 5 at Max effort — stay there.
2. **Take a big enough bite.** Precision is set entirely by the gap:

   | Δ on the weekly bar | Error on the derived cap |
   |---|---|
   | 3 points | ±33% |
   | 5 points | ±20% |
   | 10 points | ±10% |
   | **20 points** | **±5%** |
   | 30 points | ±3% |

   **Aim for 20 points.** That beats every third-party figure on the table, where the best is "medium confidence".
3. **Don't let the five-hour window reset mid-measurement** if you also want the ratio. For the weekly figure alone it does not matter.
4. **Don't enable usage credits.** That spends real money to learn what the percentage gives you free.

### Steps

**1. Baseline.** Record all of these at the same moment:

```
timestamp        :
weekly %         :
5-hour %         :
5-hour resets in :
context window   :        / 1M
model + effort   :
EcoMeter export  : (save the file)
```

**2. Work normally.** Same model. Keep going until the weekly bar has moved ~20 points. If your sessions are short, several sittings are fine — just don't switch models.

**3. Second reading.** Record the same seven fields, and save a second EcoMeter export.

**4. Hand both exports and both readings to a fresh session** with the prompt at the bottom of this file.

---

## The arithmetic

With input/output token totals from the two EcoMeter exports:

```
Δtokens_in  = in₂  − in₁
Δtokens_out = out₂ − out₁
Δweekly%    = weekly₂ − weekly₁          (as a fraction, e.g. 20 points → 0.20)

weekly cap, in tokens   = Δtokens ÷ Δweekly%
weekly cap, in dollars  = (Δin × input_rate + Δout × output_rate) ÷ Δweekly%
```

Rates come from `extension/prices.json` → `api.anthropic["claude-opus-5"]`. **Use the live file, not a number copied into this doc** — it re-prices itself and this page does not.

For the ratio, if both bars moved and neither reset:

```
weekly ÷ five-hour = Δ5-hour% ÷ Δweekly%
```

### Two things that will bite

- **Caching.** Neither this site nor EcoMeter models prompt caching, and at 500k contexts most re-sent input is probably cached and billed far below the standard input rate. So a dollar figure derived this way is an **upper bound**. If the derived cap looks implausibly large, caching is the first suspect.
- **Context management.** Anthropic states that "longer conversations that trigger automatic context management consume more of your usage limit," so a long chat may cost more than its token count implies. Prefer several medium conversations over one enormous one.

---

## What to do with the answer

1. **`plan-limits.json` → Claude Pro.** A measured cap moves from `unquantified_windows` into `caps[]` with `provenance: "measured"` — a value that does not exist yet and will need adding to `_meta.provenance_legend`. It must carry the sample size, the date, the model, and the caching caveat.
2. **⚠️ Do not let it silently drive the Auditor.** `audit.html`'s fit test reads `cap` to decide whether a tier is big enough. A single-account measurement is not a population figure, and one user's long-context habit is not a general limit. Land it as a **displayed** figure on `pricing.html` first, clearly labelled as one account's measurement.
3. **The ratio is the transferable part.** Replace, or at least corroborate, the Z.ai 5× anchor used for every other provider's weekly estimate. `FRESHNESS.md` B9 records where that anchor is used.
4. **Re-run `node scripts/test-auditor.js`** — §8 pins the Z.ai 6.72× and the FRESHNESS B9 state counts, and both may move.

---

## Still open, and cheap to close

- **Does a Max account show a sibling bar?** "Weekly · **all models**" implies a meter scoped to a subset — most plausibly a separate weekly budget for the priciest model. Only ever seen on Pro, where no sibling appeared.
- **"See detailed breakdown"** is a link in the usage popover and has never been opened. It may quantify something. Worth one click before doing any of the above.

---

## Prompt for the fresh session

> I'm measuring Claude Pro's weekly usage cap. Read `MEASURE-CLAUDE-LIMITS.md` and `FRESHNESS.md` B6/B9 first.
>
> Here are two readings and two EcoMeter exports taken between them: [paste].
>
> Derive the weekly cap in tokens and in dollars at the live rates in `extension/prices.json`, and the weekly-to-five-hour ratio if both bars moved. State the error bars from the percentage quantisation, and flag the caching caveat rather than burying it. Then propose — don't apply — the `plan-limits.json` change.
