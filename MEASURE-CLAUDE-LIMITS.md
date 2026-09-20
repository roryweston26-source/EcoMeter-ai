# Measuring Claude's usage limits

_A protocol for putting a real number on the figures Anthropic meters and won't publish. Written 2026-09-01, rebuilt 2026-09-02 around a better instrument. Read `FRESHNESS.md` **B6** and **B9** for the surrounding context._

---

## Why this is worth doing

Anthropic **meters** two windows precisely enough to render live percentages against them, several times a session. It never states either denominator. You can watch yourself reach 43% of something you will never be told the size of.

Two facts make that gap closable **without any further disclosure from Anthropic**:

1. **The product gives you a percentage.** The usage panel shows a 5-hour bar with a countdown and a *Weekly · all models* bar with a named reset.
2. **Anthropic prices the overage.** "Usage credits are billed at standard API rates" — the same rates `extension/prices.json` already carries.

**The second prize is bigger than the first.** The weekly-to-five-hour *ratio* is what every other provider's weekly estimate currently rests on, and today that rests entirely on Z.ai's published 5×. A measured Anthropic ratio is a second anchor from a different company, and it improves the OpenAI, Google and Perplexity estimates too — none of which we can measure directly.

---

## The instrument

**Run `node scripts/measure-claude-limits.js`.** Everything below is what it does and why.

### Read the meters with the copy button, not a screenshot

The usage panel has a **copy icon in its top-right corner**. It emits a machine-readable report, and it is strictly better than reading percentages off a picture:

```
Plan limits:
- session-0: 4% (resets 2026-09-03T02:50:00.618709+00:00)
- weekly_all-1: 8% (resets 2026-09-05T06:00:00.618731+00:00)
Local activity: 72 requests (24h) | 2138 (7d)
```

**Exact reset instants**, so the 10-minute rounding stops being guesswork — and the two microsecond stamps land 22µs apart, which shows both are computed as *now + seconds remaining* from one API response. **Named meters with indices**, `session-0` and `weekly_all-1`: the numbering implies a list, so a plan with a third meter would show it here rather than requiring a screenshot to be interpreted. Use this every time; only fall back to a screenshot if the button is gone.

### The request counts validate the parser exactly

The report's own **Local activity** line is the best cross-check available, because it is Anthropic's count of the same events:

| | report | deduped on `message.id` |
|---|---|---|
| 24h | 72 | **72** |
| 7d | 2138 | **2138** |

**Exact, both windows.** So the app counts *requests* correctly and *tokens* incorrectly — it dedupes for the activity line and not for the Breakdown. That closes the question of which side the content-block over-count is on.

### The rejections say which meter fired, and whether money was involved

Every 429 in the transcripts carries a `quotaLimits` object alongside the error text.
Found 2026-09-05 by grepping the transcripts for it; it had been sitting there the whole time:

```json
{"status":"rejected","resetsAt":1788070200,"rateLimitType":"five_hour",
 "overageStatus":"rejected","overageDisabledReason":"org_level_disabled",
 "isUsingOverage":false,"unifiedRateLimitFallbackAvailable":false}
```

Three things fall out, and none of them needed a percentage reading.

**`rateLimitType` names the meter.** All seven rejections on disk say `"five_hour"`. The
five-hour measurement's load-bearing assumption — that these are five-hour rejections and
not weekly ones — is now **read off the record rather than assumed**.

**So a weekly 429 would announce itself.** It would be a 100% observation of the weekly
window carrying *no percentage rounding at all*: the weekly cap could be read exactly the
way the five-hour one was, and `resetsAt` would hand over the window's exact end. **That is
the cheapest route left to closing the weekly and it costs nothing but waiting.** The script
used to discard non-five-hour rejections silently; it now prints one as the prize it is.

**`isUsingOverage: false` on all seven**, with `overageDisabledReason: "org_level_disabled"`
— no paid credit topped up any of the six windows, so each is an observation of the plan and
not of a purchase. That also bears on the parked mid-week reset below: as of the last 429 on
2026-08-30, overage was disabled at org level on this account, which **weakens the
"usage-credit top-up" explanation for the 2026-09-01 reset without killing it** — nothing
here covers what may have changed in the two days between.

### The first version of this protocol named the wrong tool

It said to pair panel readings with an **EcoMeter export**. That is wrong for this job, and wrong in a way worth recording: EcoMeter watches the claude.ai DOM, and **Claude Code usage never touches a browser**. On an account that uses Claude Code, an EcoMeter export measures nothing that is burning the limit.

The right instrument was already on disk. The `.jsonl` transcripts under `~/.claude/projects` record **every API request** with exact `input_tokens`, `cache_creation_input_tokens` (split into 5-minute and 1-hour), `cache_read_input_tokens`, `output_tokens`, model, effort and timestamp.

That demotes the old protocol's headline caveat. **Caching is no longer a caveat; it is a measured field.**

### Two counting traps

**1. The transcript writes one assistant message once per content block**, and every copy carries the identical, complete usage object. A message with a thinking block and two tool calls appears three times. Summing lines over-counts — 2.3× on a real session. **Dedupe on `message.id`.** Not on `requestId` (one request can span several messages), not on line count.

**Claude Code's own usage panel gets this wrong.** Measured 2026-09-02 against one live session:

| | panel | actual |
|---|---|---|
| Input | 122 | 56 |
| Cache read | 6M | 2.85M |
| Cache write | 235.9k | 104k |
| **Cost** | **$3.27** | **$3.27** |

Its token rows show the summed figure; its Cost row shows the deduped one. **The cost agreement to the cent is what validates the parser** — and it means the panel's Breakdown must not be quoted as token counts.

**⚠️ The over-count factor is not a constant, so never "correct" for it.** It is the mean number of content blocks per message over the window in question, which tracks how tool-heavy the work was. Measured on the same session at three moments: **2.1–2.6×** during tool-dense stretches, **1.2–1.7×** during long prose writes. Only the dedupe is right; a fudge factor is not.

**The "Output 186" anomaly is resolved, and it was a client bug.** Client `1.44121.1` reported Output as 186, then 361, then 555 — matching neither the summed nor the deduped basis by three orders of magnitude, while every other row over-counted consistently. Client **`1.44121.2`**, which arrived mid-session on 2026-09-03, reports **191.2k against an actual 138.5k** — over-counted like its neighbours, and sane. So the row was broken in `.1` and behaves in `.2`. **Check the client version before trusting or reporting any panel figure**; the copy report prints it.

**2. Anthropic rounds a window's reset time up to the next 10-minute mark.** So `resetsAt − 5h` can precede the window's true first request by up to ten minutes. A larger gap means usage we cannot see opened that window; the script marks the sample **contaminated** and drops it rather than averaging it in. One of six samples failed this test at 83 minutes.

### Scope — the load-bearing caveat

This reads **one machine's Claude Code transcripts**. Any use of claude.ai, mobile, or a second machine on the same account counts against the same meters and is invisible here, which biases every cap **downward**. Claude Code's own panel says the same of itself: *"this machine only, excludes claude.ai."*

**⚠️ RETRACTED 2026-09-05. The confirmation this section rested on was wrong.** It used to read: *"Only quote these figures for an account whose owner confirms Claude Code on one machine is all they use. For the readings below, Rory confirmed exactly that on 2026-09-02."* When the quiet column turned one anomaly into a four-interval pattern and the question was put again, the answer changed: **claude.ai and the mobile app are also in use on this account.**

So the caveat is no longer a caveat. **The scope is violated, measurably**, and every cap in this document is a **contaminated floor** rather than a figure with a caution attached. Nothing here may be quoted as a measurement of Claude Pro's limits; it is a lower bound on one account's, taken through a partial window onto it.

**What that costs, and what it does not.** The five-hour cap survives better than the weekly: a 429 is a 100% observation whose window we can bound, and the contamination test already drops windows opened by usage we cannot see — one of six failed it and was excluded. The weekly has no such anchor and is hit hard; see the quiet column below. **The fitted *unit* is barely affected at all**, because α and β come from the *ratio* between windows, and browser usage would have to be systematically skewed toward cache reads to move it.

**The practical rule for any future run: no claude.ai and no phone while measuring.** It costs nothing and it is the only thing that makes a bracket mean what it says.

**And EcoMeter is the missing half.** This project already ships a tool that watches the claude.ai DOM — the same tool this protocol correctly rejected for measuring *Claude Code*. For browser usage it is exactly right, and the two instruments are complementary rather than rival: transcripts for Claude Code, EcoMeter for claude.ai. Neither sees the phone. That does not close the gap, but it is the cheapest partial fix available and it uses something already built.

### An exact reset instant is also a DETECTOR for unseen usage

This is the strongest reason to use the copy button. **A five-hour window opens on its first request.** So `resets − 5h` names a moment when *something* was sent. If the transcripts are silent there, the account is being used somewhere we cannot see, and the confirmation above has quietly stopped being true.

**It fired on its first outing.** The 22:08:50Z report gave `session-0: 4%` resetting at 02:50:00Z, so that window opened at **21:50Z**. The transcripts contain **nothing at all between 20:25:06Z and 22:09Z** — no requests, no sidechains, no file writes anywhere under `~/.claude/projects`. A window we did not open, carrying 4% (~124k units) we did not spend.

**Do not average past this.** Unseen usage biases every cap **downward**, and the whole method rests on the denominator being complete. Resolve it before quoting anything: another device, the mobile app, claude.ai in a browser, Claude Code on the web, or a second machine.

---

## What is measured: the five-hour cap

**A 429 is a 100% observation.** It needs no percentage reading at all, and `resetsAt − 5h` gives the window's exact start. The transcripts hold six of them, all pure Opus 5:

| window start (UTC) | unseen | reqs | cache write | cache read | output | cost |
|---|---|---|---|---|---|---|
| 2026-08-24 16:40 | 11m | 239 | 0.94M | 41.7M | 234k | $36 |
| 2026-08-26 00:00 | 83m | 212 | 0.87M | 59.6M | 210k | $44 — **contaminated** |
| 2026-08-28 18:30 | 7m | 129 | 1.69M | 27.4M | 182k | $35 |
| 2026-08-28 23:30 | 2m | 328 | 1.15M | 70.8M | 236k | $53 |
| 2026-08-30 01:10 | 8m | 373 | 1.16M | 111.0M | 296k | $74 |
| 2026-08-30 13:30 | 10m | 298 | 1.48M | 72.3M | 220k | $56 |

### The estimator: the upper envelope, not the mean (rebuilt 2026-09-06)

**The old fit took the mean of the windows and chose (α, β) to minimise their spread.** That is correct when errors are symmetric. They are not: usage on claude.ai, a phone or a second machine burns the same meter and is invisible here, so **a window's visible units can only ever be too SMALL**. Every 429 is a **lower bound** on the cap, and a window far below the others is measuring contamination, not a smaller limit.

**The damage was not hypothetical.** A seventh window arrived on 2026-09-05 at a fifth of the usage of any other. Minimising spread answered by dragging β from 7.75 to **21.5** and the cap from 3.09M to **5.05M** — distorting the unit to accommodate a window that was mostly spent somewhere else.

**So the cap is `max_i units_i`, and nothing is discarded.** A contaminated window sits below the envelope, and its distance below estimates what was spent off-machine. The `unseenMin` exclusion is gone: the 83-minute window is back in, sitting 28% short instead of being dropped.

**β is fixed by reconciling two independent families, not by internal spread.** β is badly identified by the rejections alone — on the same seven windows, minimising CV says 21.5 and minimising one-sided shortfall says 4.75. A **panel delta** ("the five-hour bar moved 12 points while we spent these tokens") implies a cap from data the rejection fit never sees. Both families are lower bounds, so if β is right their highest members name the same cap. **They agree to 0.0% at β = 8.2**, and to within 2% over **β ∈ 6.8–10.1**.

**⚠️ α is IMPOSED at 0, not fitted, and that correction came out of testing.** Cache reads run 16M–111M per window against 0.9–1.7M of cache writes and 0.14–0.30M of output — one to two orders of magnitude larger than everything else, so a hair of α swamps the unit and buys agreement for free. Left free, the search wandered to α = 0.04 on synthetic data with a known answer and returned a β less than half the truth. **That α came back 0 on the real rejections was partly luck.** It is now imposed, and the claim is carried by evidence beside the fit: a free one-sided search does put it at 0 and holds it there when the contaminated window is added; at the billing weight of 0.1 the two families disagree by **36%** instead of 0.0%; and the one exact-agreement branch off zero needs α = 0.02 with **β = 36** — output weighing seven times the price list — which is the degeneracy, not a rival answer.

**⚠️ THE LOWER-BOUND GUARANTEE IS CONDITIONAL, and the condition is not met on this account.** Measured over synthetic samples with a known answer:

| | result |
|---|---|
| at the true β | envelope ≤ truth, always |
| one clean window **and** one clean panel delta | fitted cap ≤ truth, always |
| **nothing clean in either family** | **overshoots in about a third of samples, badly** — and the β band does not rescue it |

So "the cap is at least X" holds only if at least one observation in each family was uncontaminated. **We do not know that any window here is clean.** The way to earn it is a run with the browser and phone deliberately untouched.

**Guarded by `scripts/test-limit-envelope.js` — 20 assertions.** It builds windows from a known cap and known β, hides known fractions of them, and checks the estimator recovers β, the cap and each window's hidden fraction exactly; then checks it **refuses to move** when a badly contaminated window is added. The superseded estimator runs on the same data and is **required to fail** that test, because a change nobody can demonstrate the need for is not an improvement.

### The limit is not the bill

Observations of one cap that disagree by 3.8× in raw tokens are observations of the wrong unit. The script solves for the unit in which they agree:

```
units = input + cache_write + α·cache_read + β·output
```

**Two findings, and both survived the estimator being rebuilt** — which is the main reason to believe them, because the rebuild moved the method underneath them and they did not move:

- **Cache reads weigh nothing.** α = 0. At their *billing* weight of 0.1, with β re-optimised in their favour so the comparison is fair, the two independent families disagree by **36%** instead of 0.0%. **Re-sent context is close to free against the limit**, the opposite of what a naive token model says — and the opposite of what our own cost model assumes for billing.
- **Output weighs about 8×**, against **5×** on the price list. The reconciled value is **β = 8.2**, with the two families agreeing to within 2% over **6.8–10.1**. The old mean-spread fit said 7.75 on five windows and 21.5 on seven; the reconciled figure is stable because it is anchored on data the rejection fit never sees.

**FIVE-HOUR CAP ≥ 3.58M units**, band **3.17M–4.14M** across the β range — and the **≥** is doing real work, not hedging: see the conditional above. The seven windows span **$16–$74** of API-equivalent billing, which is the point: **the meter is not the invoice.**

**What each window's shortfall below the envelope says about off-machine usage:**

| window start (UTC) | units | short of the envelope |
|---|---|---|
| 2026-08-30 01:10 | 3.58M | **0%** — sets the envelope |
| 2026-08-30 13:30 | 3.28M | 8% |
| 2026-08-28 18:30 | 3.19M | 11% |
| 2026-08-28 23:30 | 3.09M | 14% |
| 2026-08-24 16:40 | 2.86M | 20% |
| 2026-08-26 00:00 | 2.59M | 28% |
| 2026-09-05 11:00 | 1.56M | **56%** — most of that window was spent elsewhere |

Under a one-sided error model these are not residuals. **They are estimates of how much of each window went to claude.ai or the phone**, and they say this account's Claude Code transcripts see roughly 80–90% of a good window and **under half of a bad one**.

### It predicts out of sample

**⚠️ This section has been WEAKENED by the 2026-09-06 rebuild, and saying so is the point.** The old fit used only the 429s, so the panel readings were genuinely out of sample:

| check | old model | panel | error |
|---|---|---|---|
| mid-scale level, 2026-09-02 16:26 | 18% | 17% | 1pp |
| mid-scale level, 2026-09-02 20:18 | 45% | 43% | 2pp |
| cap from a 12-point move (C→D) | 3.43M | — | +11% |
| cap from a 14-point move (D→E) | 3.21M | — | +4% |

Those were real checks and they passed: raw tokens would have said 4% and API dollars 13% against an actual 17%, so the unit was doing the work rather than the fitting.

**But the new estimator uses the C→D and D→E deltas to identify β.** They are inputs now, not tests. **The two families agreeing to 0.0% is therefore not evidence of anything on its own** — it is the criterion being satisfied, which is what fitting means. What the agreement *does* buy is different and still worth having: β is anchored by a second observation type instead of by the internal spread of a contaminated sample, which is why it stopped moving when the seventh window landed.

**So the honest position: the model currently has NO out-of-sample check.** Restoring one is cheap and the next reading does it — any new panel delta, or any new 429, can be predicted before it is added. **Do that before quoting the cap as anything but a floor.**

---

## The weekly cap, which is not solved

### The ceiling, and it is already in FRESHNESS B6

```
weekly ÷ five-hour ≤ 168h ÷ 5h = 33.6
```

B6 derives this to make a different point — that a provider would have to set the weekly at 33.6× for the short window ever to bind, and Z.ai sets it at 5×. **Used as a check on our own arithmetic it is just as sharp:** no ratio above 33.6 is reachable even by flat-out use, so **an estimate above it is wrong, not merely high.** The script asserts it on every pair. It costs nothing and it kills a whole class of answers for free.

### The readings

| # | When (UTC) | Context | 5-hour | Weekly |
|---|---|---|---|---|
| A | 2026-09-01 ~17:00 | 496.7k / 1M | 25%, resets in 3h54m | 43% |
| B | 2026-09-01 ~20:05 | 532.9k / 1M | 18%, resets in 4h47m | **2%** |
| C | 2026-09-02 16:26:35 | 0 | 17%, resets in 4h55m | 4% |
| D | 2026-09-02 16:47:30 | 136.7k / 1M | 29%, resets in 4h34m | 5% |
| E | 2026-09-02 ~20:18 | — | 43%, resets in 1h03m | 7% |
| F | 2026-09-02 22:08:50 | — | 4%, resets 2026-09-03T02:50:00Z | 8% |

All five screenshots label the weekly reset "Sat 2:00 AM"; **F states it exactly: `2026-09-05T06:00:00Z`**, which is Saturday 02:00 US Eastern. The label is accurate.

### Current best estimate

**C → F is a four-point move on 1.259M units: weekly cap = 31.5M units = 10.2 five-hour caps**, band **8.1–13.6** for ±1 point of rounding. Against Z.ai's published 5×.

Quote **~10×** with the band, never a point estimate. Narrower slices give 7.3× (D→E) and 12.9× (E→F), which is what ±1 point on a one- or two-point move looks like and is the reason to pool.

**⚠️ This is a floor, not a centre.** The unseen-usage detector fired inside this very interval (see above), so the true units spent between C and F are **higher** than 1.259M and the cap is correspondingly higher.

**C, D, E and F carry usable timestamps; A and B do not**, and B sits within minutes of a weekly reset. The B → C pair reads **19.4×**, the highest of any, which is exactly what a few minutes of pre-reset usage wrongly attributed to the new window would do. **Pairs anchored on B are excluded, not averaged in** — and the reason to distrust B is structural, not that it disagreed.

### The quiet column, and why ~10.2× is worse than a floor (2026-09-05)

The script now reports, for every pair, **the longest stretch inside it with no request in the transcripts at all**. Adding the 2026-09-03T03:31 baseline as a fifth reading — it had been set aside as "a starting line, not a data point", and pairing it is what exposed this — the four pairs line up like this:

| pair | quiet | weekly Δ | reads |
|---|---|---|---|
| C → D | **11m** | 1pp | **13.3×** |
| E → F | 104m | 1pp | 12.8× |
| D → E | 197m | 2pp | 7.3× |
| F → baseline | **317m** | 4pp | **3.1×** |

**The more silence, the lower the answer, monotonically.** That is not a coincidence and it is not noise: unseen usage can only ever bias a pair *downward*, because the bar moves on usage we did not see and we divide the usage we did see by that larger move. A pair with five hours of silence and a four-point climb is not measuring a smaller cap; it is measuring how much was spent elsewhere.

**The F → baseline pair is the loudest evidence this project has that the one-machine scope is being violated.** Eighteen requests, all inside a five-minute burst ending 22:14:08Z, then **nothing for 5h17m** — while the weekly climbed four points. Percentage rounding cannot rescue it: even the most generous reading of "8% to 12%" as a three-point move gives 13M, still 2.4× below the C→F figure. And the transcripts are not the thing at fault — the copy report's own **Local activity** count of 4637 all-time straddles our parse exactly (4631 at 03:31:10Z, 4639 at 03:33:10Z), so this machine's record is complete. **Roughly 0.9M units were spent somewhere else that night.**

**Consequences, and they are not small.**

- **~10.2× is not merely a floor, it is a floor dragged down by contamination.** C → F pools intervals carrying 104 and 197 minutes of silence. The cleanest pair on record, C → D with eleven minutes of quiet, reads **13.3×**.
- **But C → D is a one-point move**, so on rounding alone its honest band is 6.7× to unbounded above. A clean pair and a tight pair are not the same thing, and we currently have neither together.
- **Take the maximum across pairs, never the mean.** The script says so now and names the offending pairs rather than averaging them into the answer.

### Parked: the mid-week reset

**Recorded, not being pursued — Rory's call on 2026-09-02.** Kept here because an observation is not less true for being inconvenient, and because anyone re-deriving the weekly from *cumulative* usage will hit it within minutes.

Reading A → B is a **43% → 2% drop** across about three hours on Tuesday 2026-09-01. Back-solving the measured cap against a later reading independently dates a reset to **2026-09-01T20:16Z** — eleven minutes from where A→B brackets it, from methods sharing no inputs. Anthropic's Max-plan article says this should not happen: *"The weekly limit resets at a fixed time each week that is assigned to your account. Your reset day and time stay the same regardless of when you start using Claude."*

Cause unknown, and the candidates are not equivalent — a usage-credit top-up or bundle, a plan change, an Anthropic-side adjustment, or documented behaviour differing from actual. **Nothing about it may be published until someone establishes which**, because "Anthropic's docs are wrong" and "the account holder bought credits" are one question apart and only one is a finding.

**The practical consequence, and the reason this does not block the measurement:** derive the weekly from **Δ between two readings**, never from cumulative usage since a stated reset. A Δ needs no window start, so it is immune to all of the above. Every figure quoted here is a Δ.

---

## Which plans this covers — Pro only, and the ratio does NOT transfer

**Everything above is one Claude Pro account.** Nothing here measures Free, Max 5×, Max 20×, Team or Enterprise. The obvious hope is that the *ratio* transfers even though the cap does not, so a Pro measurement would improve every Anthropic row. **Anthropic's own wording says it does not**, and the way it says so is itself the finding.

From the Max-plan article (fetched 2026-09-02):

> - "More usage capacity: Get **5x or 20x more usage than the Pro plan**, depending on your selected tier."
> - "Max 5x provides **five times more usage per session** than the Pro plan."
> - "Max 20x provides **20 times more usage per session** than the Pro plan."
> - "Your session-based usage limit will reset every five hours. Max plans **also have a weekly usage limit** that applies across all models."

**The multiplier is attached to the session window and to nothing else.** The weekly is introduced in the next breath as a separate thing, with no multiple, no size, and no relationship to the 5× or 20× stated anywhere. Read literally, "5x more usage per session" is a claim about the five-hour cap alone.

**So the ratio scales inversely with whatever the session multiplier is, unless the weekly scales with it too.** Taking our ~10.2× on Pro:

| plan | if the weekly scales the same | if the weekly does not scale |
|---|---|---|
| Pro | 10.2× | 10.2× |
| Max 5× | 10.2× | **2.0×** |
| Max 20× | 10.2× | **0.5×** |

**A ratio below 1 is not a rounding difference — it means the weekly is exhausted before a single five-hour window can be filled**, and the five-hour bar becomes decorative. The truth is somewhere between the columns and **Anthropic publishes nothing that narrows it**.

**The consumer-facing version, and it is exactly the gap this project exists to close:** upgrading to Max buys a stated 5× or 20× on the window that clears itself in five hours, and an **unstated** multiple on the window that governs your month. Anthropic quantifies the multiplier on one meter and not the other, in the same paragraph. That asymmetry is published, not inferred, and it can be said today without measuring a single Max account.

**⚠️ Do not extrapolate our Pro figure to any other plan, in either direction.** Record it as Pro-only in `plan-limits.json`. The same paragraph also reserves more meters than the two on screen — *"we may limit your usage in other ways, such as weekly and monthly caps or model and feature usage, at our discretion"* — so even the two-meter picture is not guaranteed complete.

**How to close it:** one Max account, one week, the same script. The five-hour cap alone would test the published 5×/20× claim directly, which nobody appears to have done.

---

## Closing the weekly: catch ticks, not levels — built, and its price is measured

A one-point move on the weekly bar carries ±1 point of rounding **at both ends**, so a single pair cannot beat about ±50%, no matter how exact the token side is. **Percentage quantisation is the only error term left**, and the way to beat it is to stop reading levels.

**Between the instant the bar turns v−1 → v and the instant it turns v → v+1, exactly one point of the cap is spent**, and the usage between those instants is exact on disk. Neither instant is ever *seen* — only that the bar read v at one glance and v+1 at the next — so the estimator brackets rather than pretends:

```
capLo = 100 × units(first sighting of v   → last sighting of v)     ≤ cap
capHi = 100 × units(last sighting of v−1  → first sighting of v+1)  ≥ cap
```

Nothing is assumed about how the product rounds — floor, round and ceil all satisfy it — and several brackets combine by **intersection**. Live in `scripts/measure-claude-limits.js`; the readings file format is unchanged, it just wants more rows.

**When the brackets do not intersect, that is a finding, not an error to smooth.** A lower bound above an upper bound means one interval holds usage the transcripts cannot see, or that α and β are wrong for that stretch. The script says `CONTRADICT` and refuses to average.

### What the precision costs, measured rather than guessed

**⚠️ These are simulation figures, not measurements of Anthropic.** They replay the real 2026-08-24 → 09-01 token stream against a *hypothetical* 31.5M cap and ask how tightly the estimator recovers it. They say what glancing buys. They say nothing about what the cap is.

| glance every | median single bracket | six in a row | the whole run (34 ticks) |
|---|---|---|---|
| 30 min | — | — | 14.6× — useless |
| 15 min | 6.2× | — | 2.34× |
| 10 min | 4.6× | — | 1.54× |
| 5 min | 3.4× | — | 1.18× |
| **3 min** | 2.08× | **1.22× (worst 1.47×)** | **1.06×** |
| 1 min | 1.40× | — | 1.06× |

**Three things to take from it, and the second one is the one that changes the plan.**

- **Three minutes is the cadence.** Below it nothing improves, because the floor is set by how far apart the *requests* are and not the glances — one request is about 4% of a point at this burn rate.
- **Six ticks is the target, not two.** Two consecutive ticks read a median 1.46× and can be as bad as **6.05×**; six read a median **1.22×** with a worst case of 1.47×, which already beats the 8.1–13.6 band we have now. The doc used to say two ticks bracket a point — true, and not sufficient.
- **Every window tested contained the true cap** — all 33 pairs, 32 triples, 31 quads and 29 six-runs. The method varies in how tight it is. It does not lie.

### It breaks when its assumptions break, which is the point

`scripts/test-limit-ticks.js` — 24 assertions, run against a cap it already knows, then each assumption violated in turn. It prefers the real transcripts and falls back to a seeded synthetic stream, so CI runs it too.

- **20% of usage hidden off-machine** → the bracket lands *below* the true cap and stays there. This is the scope caveat made mechanical, and it is why every figure here is a floor.
- **A mid-run meter reset** → the readings split into runs; no bracket spans the boundary.
- **A changed reset instant with the level still rising** → also splits, because the label is the only clue a reset leaves when it lands on the same number.
- **A bar advancing slower than the unit model predicts** (a wrong α or β) → reported as a contradiction. This is the one failure the five-hour fit cannot catch on its own.
- **A level glimpsed once** → no bracket at all, rather than a confident-looking one.

### Anchor for the next run

**⚠️ EXPIRED.** The baseline below was taken in the weekly window that ended at **2026-09-05T06:00:00Z**. That window has closed, so this reading can no longer be paired with anything. Kept for its shape details, which still hold.

**Baseline, deliberately excluded from every estimate above — it is a starting line, not a data point.**

```
2026-09-03T03:31:10Z   client 1.44121.2
  session-0     : 0%   (no reset shown)
  weekly_all-1  : 12%  (resets 2026-09-05T06:00:00Z)
  local: 4637 requests all-time (2026-07-11 onward), $1095.43 at prices.json rates
```

Two shape details worth keeping. **An empty five-hour meter prints no reset instant at all** — `session-0: 0%` with nothing after it — so the unseen-usage detector simply has nothing to check while the window is closed; it works only once a window is open. And the weekly reset instant is **unchanged** from the 22:08Z report, confirming no weekly reset in between.

**A fresh weekly window opened at 2026-09-05T06:00:00Z**, which is the good news buried in the expiry: the run below can start from an almost-empty bar, and the first ticks are the cheapest ones to catch.

### Steps

0. **⚠️ No claude.ai and no phone until the run ends.** This is not hygiene, it is the difference between a bracket and a guess: browser and mobile usage burn the same meters and are invisible to the transcripts, and on this account they have already been measured doing exactly that (see the quiet column). One touch of the app mid-run silently drags every bracket downward.
1. **Keep the usage popover where you can glance at it.** Work normally, one model only — the bar says *all models*, so a Sonnet/Opus mix pools things that cost different amounts per token and will not decompose.
2. **Copy the report about every three minutes while working hard**, and stop when six ticks have been caught. Not every three minutes for a week — six ticks is the target, and the table above is why. Idle time costs nothing, so glance only while requests are actually going out.
3. **Never hand-type a reading.** Paste the copy-button output straight into the parser:
   ```
   node scripts/parse-usage-report.js --into readings.json --file paste.txt
   ```
   It keeps the exact reset instants (the "Sat 2:00 AM" label throws them away, and only the exact form detects a reset landing on a number the bar already showed), records the client version and the Local activity counts, and **shouts if a meter appears that this plan has never shown** — the `-0`/`-1` indices are positions in a list, so a third one would simply turn up. Hand-copying percentages into JSON dozens of times is exactly how a wrong number gets into a dataset that is later defended as measured.
4. **Rows at the same level are the point, so never skip a glance because the number has not changed.** An unchanged reading is what pins the lower end of that level's bracket. The parser says so each time rather than letting it feel wasted.
5. **The parser checks each interval while it is still cheap to fix.** It prints what the last gap implies and flags the impossible: a bar that moved while this machine sent nothing, an implied cap far below every clean reading, or anything above the 33.6× ceiling. **Finding contamination during the run is worth far more than finding it afterwards** — which is the whole lesson of 2026-09-02.
6. **Don't enable usage credits.** That spends real money to learn what the percentage gives free — and `isUsingOverage` shows it would make every window an observation of a purchase instead of the plan.

### What still bites

- **Context management.** Anthropic states that "longer conversations that trigger automatic context management consume more of your usage limit". The panel's own attribution agrees — it blamed 90% of one day's limit use on sessions that *"ran above 150k context"*. **That sits in tension with α = 0**, since a long context is mostly cache *reads*. The reconciliation is probably that a long context forces a large cache *write* every turn, and writes count at full weight — **but that is unproven and worth a targeted test.**
- **A five-hour reset mid-measurement** costs the ratio but not the weekly figure.

---

## What to do with the answer

1. **`plan-limits.json` → Claude Pro.** A measured cap moves from `unquantified_windows` into `caps[]` with `provenance: "measured"` — a value that does not exist yet and will need adding to `_meta.provenance_legend`. It must carry the sample size, the date, the model, **and the one-machine/one-account scope**.
2. **⚠️ Do not let it silently drive the Auditor.** `audit.html`'s fit test reads `cap` to decide whether a tier is big enough. A single-account measurement is not a population figure, and one user's long-context habit is not a general limit. Land it as a **displayed** figure on `pricing.html` first, clearly labelled as one account's measurement.
3. **The ratio is the transferable part.** Replace, or at least corroborate, the Z.ai 5× anchor used for every other provider's weekly estimate. `FRESHNESS.md` B9 records where that anchor is used.
4. **Re-run `node scripts/test-auditor.js`** — §8 pins the Z.ai 6.72× and the FRESHNESS B9 state counts, and both may move.

---

## Evidence quality, stated plainly

**One account, one model, six 429s and five panel readings — and a partial view of the account, not a whole one.** The five-hour cap and its unit are on reasonably firm ground: five independent 100% observations, a 1.25× spread, a successful out-of-sample prediction, and — since 2026-09-05 — every one of those rejections confirmed as a *five-hour* rejection by its own `rateLimitType`, on a plan with overage disabled.

**The weekly is not, and 2026-09-05 made it worse rather than better.** It rests on a single one-point move, a hypothesis about when its window reset, and readings taken through a window we now know was partial: the same day established that **claude.ai and the phone are also in use**, that the pairs sort monotonically by how long the transcripts fall silent, and that ~0.9M units went unseen in a single night. **The instrument for fixing all of that now exists and is tested. What it lacks is a clean run** — dense glances, browser and phone untouched.

**Nothing here establishes a population figure, and after the retraction it does not cleanly establish an account figure either.** It establishes a defensible *unit*, a five-hour cap that is close to right for one heavy user, and a weekly lower bound whose contamination is now measured rather than feared.

The ratio is still worth one anchor beside Z.ai's — but only once a clean run replaces the contaminated one.

---

## Still open, and cheap to close

- **ANSWERED 2026-09-05, and it closed against us: claude.ai and the mobile app are in use on this account.** The question began as one anomaly — a five-hour window opening at 2026-09-02T21:50Z with 104 minutes of silence around it — and the quiet column turned it into a **monotonic pattern across four intervals** (11m of silence reads 13.3×, 317m reads 3.1×), with roughly **0.9M units spent between 22:14Z and 03:31Z while the transcripts were completely silent** on a machine whose record we verified complete against the copy report's own request count. Rory then confirmed browser and phone use, retracting the 2026-09-02 confirmation this document had been resting on. **Every cap here is now a contaminated floor by measurement, not by caution**, and future runs need "no claude.ai, no phone" as a stated precondition. Still open underneath it: **how much** of the account's usage goes through the browser, which EcoMeter could answer for the browser half and nothing available answers for the phone.
- **Wait for a weekly 429 — the cheapest route of all, and it costs nothing but patience.** `rateLimitType` on the rejection record self-labels the meter, so a weekly rejection would be a 100% observation of the weekly cap with no percentage rounding whatsoever. The script now shouts when one appears. Nobody has to do anything for this except not stop working.
- **Parked at Rory's direction: what reset the weekly bar on 2026-09-01 at ~20:16Z?** Two independent methods agree it happened; none says why. Not being pursued; the Δ-based method routes around it. **Narrowed 2026-09-05:** all seven 429s carry `isUsingOverage: false` with `overageDisabledReason: "org_level_disabled"`, so overage was off at org level through 2026-08-30 — which makes a usage-credit top-up a *worse* explanation than it was, without ruling out something changing in the two days after.
- **Does the published 5×/20× apply to the weekly, or only to the session?** Anthropic states it only of the session. One Max account and one run of the script would settle both the multiplier and the ratio, and nobody appears to have tested the claim.
- **Does a Max account show a sibling bar?** "Weekly · **all models**" implies a meter scoped to a subset — most plausibly a separate weekly budget for the priciest model. Only ever seen on Pro, where no sibling appeared.
- **Test the α = 0 vs "above 150k context" tension** directly: two matched sessions, same output volume, very different context sizes.
- **The desktop app persists `{"resetsAt":…,"utilization":…}` in its localStorage** — but snappy-compressed, and only one record survives compaction. Not a reliable live source. Recorded so nobody re-treads it. **Also checked and also dead ends (2026-09-05):** `~/.claude/.claude.json` and its five rotating backups carry no utilization at all, and `quotaLimits` rides only on *rejections* — there is no per-request quota field on a successful response. The copy button remains the only source of levels.

---

## Prompt for a fresh session

> I'm measuring Claude's usage limits. Read `MEASURE-CLAUDE-LIMITS.md` and `FRESHNESS.md` B6/B9 first, then run `node scripts/measure-claude-limits.js`.
>
> Here are my panel readings: [paste, or point at a readings JSON].
>
> Derive the five-hour cap in the fitted unit and the weekly-to-five-hour ratio. **Prefer tick brackets to level pairs** — if my readings are dense enough the script produces them, and they carry no rounding error; a level pair cannot beat ±50%. Check every ratio against the 33.6× arithmetic ceiling before believing it. If the brackets contradict, say so and stop rather than averaging. Say which of the two counting traps you verified rather than assumed. Then propose — don't apply — the `plan-limits.json` change.
>
> Run `node scripts/test-limit-ticks.js` before trusting any bracket it prints.
