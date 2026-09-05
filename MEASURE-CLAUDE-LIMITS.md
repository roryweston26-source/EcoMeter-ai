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

**Only quote these figures for an account whose owner confirms Claude Code on one machine is all they use.** For the readings below, Rory confirmed exactly that on 2026-09-02.

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

### The limit is not the bill

Six observations of one cap that disagree by 3.8× in raw tokens are six observations of the wrong unit. The script grid-searches for the unit in which they agree:

```
units = input + cache_write + α·cache_read + β·output
```

| unit | spread across windows |
|---|---|
| raw tokens | 3.84× |
| API dollars | 2.12× |
| **fitted (α = 0, β = 7.75)** | **1.25×** (CV 8.3%) |

**Two findings, and both are user-facing:**

- **Cache reads weigh nothing.** α fits to 0. Forcing them to their *billing* weight of 0.1 — with β re-optimised in their favour, so the comparison is fair — degrades the fit from 8.3% to 27% CV. **Re-sent context is close to free against the limit**, which is the opposite of what a naive token model says.
- **Output weighs about 8×**, against **5×** on the price list. Indistinguishable anywhere in 4.3–15 on this sample, so quote it as "roughly 8, certainly more than the 5× the price list uses".

**FIVE-HOUR CAP = 3.09M units** (n=5, spread 1.25×, CV 8.3%). The same five windows span **$35–$74** of API-equivalent billing — a 2.1× spread, which is the point: the meter is not the invoice.

### It predicts out of sample

Fitted only on 100% points, the model has since been asked four times for something it had never seen:

| check | model | panel | error |
|---|---|---|---|
| mid-scale level, 2026-09-02 16:26 | 18% | 17% | 1pp |
| mid-scale level, 2026-09-02 20:18 | 45% | 43% | 2pp |
| cap from a 12-point move (C→D) | 3.43M | — | +11% |
| cap from a 14-point move (D→E) | 3.21M | — | +4% |

For the first two, raw tokens would have said 4% and API dollars 13% against an actual 17%. **The unit is doing the work, not the fitting.**

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

**⚠️ This is a floor, not a centre.** The unseen-usage detector fired inside this very interval (see above), so the true units spent between C and F are **higher** than 1.259M and the cap is correspondingly higher. Adding the ~124k units implied by F's unexplained 4% moves it to ~11.2×.

**C, D, E and F carry usable timestamps; A and B do not**, and B sits within minutes of a weekly reset. The B → C pair reads **19.4×**, the highest of any, which is exactly what a few minutes of pre-reset usage wrongly attributed to the new window would do. **Pairs anchored on B are excluded, not averaged in** — and the reason to distrust B is structural, not that it disagreed.

**C, D and E carry exact timestamps; A and B do not**, and B sits within minutes of the reset. The B → C pair reads **19.4×**, the highest of the four, which is exactly what a few minutes of pre-reset usage wrongly attributed to the new window would do. **Pairs anchored on B are excluded from the estimate, not averaged into it** — and the reason to distrust B is structural, not that it disagreed.

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

## Closing the weekly: catch ticks, not levels

A one-point move on the weekly bar carries ±1 point of rounding, so a single pair cannot beat about ±50%, no matter how exact the token side is. **Percentage quantisation is now the only error term left**, and the way to beat it is to stop reading levels.

**Between two consecutive ticks — 5%→6% and then 6%→7% — exactly one point of the cap is spent, and the usage between them is exact on disk.** Timing the tick replaces reading the bar. Two ticks bracket 1% with no rounding error at either end.

### Anchor for the next run

**Baseline, deliberately excluded from every estimate above — it is a starting line, not a data point.**

```
2026-09-03T03:31:10Z   client 1.44121.2
  session-0     : 0%   (no reset shown)
  weekly_all-1  : 12%  (resets 2026-09-05T06:00:00Z)
  local: 4637 requests all-time (2026-07-11 onward), $1095.43 at prices.json rates
```

Two shape details worth keeping. **An empty five-hour meter prints no reset instant at all** — `session-0: 0%` with nothing after it — so the unseen-usage detector simply has nothing to check while the window is closed; it works only once a window is open. And the weekly reset instant is **unchanged** from the 22:08Z report, confirming no weekly reset in between.

The next sub-session starts from this line. Pair it with a second copy report once the weekly has moved **four or more points** and the estimate tightens without any new machinery.

### Steps

1. **Keep the usage popover where you can glance at it.** Work normally, one model only — the bar says *all models*, so a Sonnet/Opus mix pools things that cost different amounts per token and will not decompose.
2. **Say the moment the weekly number changes, and the new value.** Nothing else. Timestamp precision of a minute or two is plenty; at the burn rate observed on 2026-09-02, one point of the weekly took about 20 minutes of heavy work.
3. **Record every reading anyway**, in a JSON file:
   ```json
   [{"ts":"2026-09-02T16:26:35Z","fiveHourPct":17,"weeklyPct":4,"weeklyReset":"Sat 2:00 AM"}]
   ```
   then `node scripts/measure-claude-limits.js --readings <file>`. Consecutive pairs give a ratio without needing to know when any window opened, and a changed `weeklyReset` or a negative delta marks the pair unusable automatically.
4. **Don't enable usage credits.** That spends real money to learn what the percentage gives free.

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

**One account, one machine, one model, six 429s and four panel readings.** The five-hour cap and its unit are on reasonably firm ground: five independent 100% observations, a 1.25× spread, and a successful out-of-sample prediction. The weekly is not: it rests on a single one-point move and a hypothesis about when its window reset.

Nothing here establishes a **population** figure. It establishes what one heavy Claude Code user's limits are, in a unit we can defend, and a ratio worth one anchor beside Z.ai's.

---

## Still open, and cheap to close

- **BLOCKING: what opened the five-hour window at 2026-09-02T21:50Z?** The transcripts are silent for the 104 minutes around it. Until this is explained the scope caveat is unproven and every cap here is a floor. One question to the account holder: phone, browser, second machine, Claude Code on the web, or a background task?
- **Parked at Rory's direction: what reset the weekly bar on 2026-09-01 at ~20:16Z?** Two independent methods agree it happened; none says why. Not being pursued; the Δ-based method routes around it.
- **Does the published 5×/20× apply to the weekly, or only to the session?** Anthropic states it only of the session. One Max account and one run of the script would settle both the multiplier and the ratio, and nobody appears to have tested the claim.
- **Does a Max account show a sibling bar?** "Weekly · **all models**" implies a meter scoped to a subset — most plausibly a separate weekly budget for the priciest model. Only ever seen on Pro, where no sibling appeared.
- **Test the α = 0 vs "above 150k context" tension** directly: two matched sessions, same output volume, very different context sizes.
- **The desktop app persists `{"resetsAt":…,"utilization":…}` in its localStorage** — but snappy-compressed, and only one record survives compaction. Not a reliable live source. Recorded so nobody re-treads it.

---

## Prompt for a fresh session

> I'm measuring Claude's usage limits. Read `MEASURE-CLAUDE-LIMITS.md` and `FRESHNESS.md` B6/B9 first, then run `node scripts/measure-claude-limits.js`.
>
> Here are my panel readings: [paste, or point at a readings JSON].
>
> Derive the five-hour cap in the fitted unit and the weekly-to-five-hour ratio. Check every ratio against the 33.6× arithmetic ceiling before believing it. State the error bars from percentage quantisation, and say which of the two counting traps you verified rather than assumed. Then propose — don't apply — the `plan-limits.json` change.
