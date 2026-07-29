# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-07-28._

> Read **CLAUDE.md** first (mission, principles, voice — auto-loaded). This is the deep dive.

---

## 0. Working state (read this first) — as of 2026-07-28

**Merged to `main` in this run** (PR #18, 2026-07-28):
- **Claude Opus 5** added everywhere ($5/$25 per 1M) — `prices.json`, `water.json`, the EcoMeter picker, `pricing.html`, Auditor plans + `ADVANCED`/`LABELS`, `update-prices.js`. Anthropic's Auditor "top model" is now Opus 5.
- **Two token-accuracy bugs fixed** (§4) — the Anthropic count API was called with a hardcoded Haiku model id, and system-prompt overhead was charged once per conversation instead of per turn.
- **Auditor panel merged into one section** (§6) with both API-key fields inline, plus a non-destructive `setup` link.
- **Store docs rewritten** (§10) — the privacy policy contradicted itself on network calls and had no justification for the Google host permission.
- **Data gaps closed** — `water.json` was silently missing 9 models; `update-prices.js` didn't know about Sonnet 5 / Fable 5 / Mythos 5.

**Ship status: v6.12 submitted to the Chrome Web Store 2026-07-28, awaiting review.** This is the first publish since v6.9, so it carries everything from the previous run too (tokenizer recalibration, opt-in Google `countTokens`, `model_usage[]` export). It adds the **`generativelanguage.googleapis.com` host permission**, so expect **permission re-review and a user-facing permission notice** — slower than a normal update. Website changes deployed on merge.

**If the review comes back with questions**, the paste-ready answers are already written: `extension/STORE-SUBMISSION.md` (single purpose, per-permission justifications, data-usage disclosure) and `extension/STORE-LISTING.md` (description + pre-upload checklist). Data-usage disclosure was submitted as **"Website content" only** — reasoning recorded in `STORE-SUBMISSION.md` §3.

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

- **Break even** — how long a day you'd have to use the plan before it beats paying per token at that provider's own API rates, shown as a **time** (`19 min–2.1 h /day`) with the message count beneath. Needs no limit data at all, so it works for all 26 plans. This is the column that actually informs a decision.
- **Ceiling** — the upper bound if the cap were hit every window, every day, for 30 days. Only computable for the **4 plans** with a published absolute cap.
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
- **⚠️ Four places must agree on a price, and three of them drift silently.** `prices.json` is the source of truth, but `pricing.html`'s `FALLBACK_PRICES` and `update-prices.js`'s hardcoded tables each hold their own copy. Before this audit `FALLBACK_PRICES` had Gemini **right** while `prices.json` had it **wrong**, and Mistral Large 3 the other way round — so the page showed different prices depending on whether the fetch succeeded. `update-prices.js` would additionally have **reverted** the Gemini fix on its next weekly run. There is a consistency script in the PR description that checks all four; run it after any price change.
- **Rates here are SHORT-CONTEXT only.** OpenAI, Google and xAI all charge ~2× past a threshold, applied to *every* token in the request. Long conversations cost more than anything computed from this file — the opposite direction to the unmodelled caching discount, so the two do **not** cancel out. Recorded in `_meta.caveats._short_context_only`; not modelled.
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

### `clock.json` — AI Clock model
`{ _meta:{anchor,last_rolled}, scenarios:{conservative|moderate|high}, rates }`. **Re-anchored 2026-07-12 (Q3).** Two-force projection (volume up, per-unit cost down); re-anchored quarterly by `roll-clock.yml` (opens a PR for a human to drop in fresh disclosures).

### `transparency-index.json` — Transparency page copy + disclosure matrix
`_meta` holds **page-level** copy (title, lede, `last_verified`, the 4-state `grade_legend`, `axes`, `methodology`, `caveats`) **plus** a nested `detail` block (its own 3-state legend/note) for the matrix. `columns`/`rows` = the 7-provider × 6-dimension **disclosure-quality matrix**. See §7.

### `datacenters.json` — per-site AI-datacenter environmental data
`{ _meta:{last_updated, methodology_note}, sites:[…] }`. Each site: `provider`, `name`, `location`, `power_mw` (+optional `power_mw_planned`), `water_grade` (transparent|partial|opaque), `water_note`, `sources[]`, `as_of`. `transparency-index.html` computes provider grades from this. See §7.

### `extension/water.json` — per-**token** model water-intensity tiers (extension only). Distinct from `datacenters.json` (per-**facility**).

---

## 6. The Subscription Auditor + EcoMeter loop (marquee feature)

**`audit.html`** — a client-side quiz recommending the plan/tier/free option that fits real usage.

- **10 questions:** 7 usage → a **5-level classification** (Dabbler → … → Power user); 3 current-spend.
- **Engine** (`recommend()`): for each provider, picks the cheapest tier clearing your **volume** (× a limit-hit headroom factor) and **model access**, flags over/under-payment vs. current spend, and does the **volume-aware downgrade** (below).
- **Plan metadata** (caps/models/features/seats) is inline in `audit.html` (approximate); **prices sync live** from `prices.json`, free-tier model lists from `free_tiers`.

**Per-model cost + generalised downgrade**
- `apiCostPerMonth(pf, only?)` prices **each model at its own rate** (rates for ~50 models pulled from `prices.json.api`), not all tokens at one rate.
- The downgrade is generalised from "free + API" to **any tier below `fit` + API for the models it lacks** — so occasional Opus/o3 use recommends e.g. *"ChatGPT Go + API for o3"* instead of jumping to Plus. Decided by real per-model cost (heavy premium use fails the test naturally — no threshold).

**EcoMeter → Auditor data path**
1. Opt into **"Usage tracking"** (📊 panel, off by default).
2. `accumulateUsage()` keeps a **local, lifetime** tally per platform/model — **counts + tokens only, no content**.
3. **⤓ Export for Auditor** downloads `ecometer-usage.json`.
4. `audit.html` **Connect usage** reads it **in-browser** (FileReader — never uploaded) and pre-fills the quiz with measured models/volume.

**`ecometer-usage.json` schema**
```jsonc
{ "app":"EcoMeter AI","kind":"usage-export","version":1,"scope":"lifetime",
  "generated":"YYYY-MM-DD","days_tracked":N,
  "platforms":[ { "provider","messages_per_day","input_tokens_per_day","output_tokens_per_day",
                  "total_messages","active_days","models_used":[...],
                  "model_usage":[ { "key","input_tokens_per_day","output_tokens_per_day" } ]  // optional per-model token split
  } ] }
```
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
| `roll-clock.yml` | Quarterly + manual | Roll `clock.json` anchor; open a re-anchor PR. Last roll 2026-07-12. |
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

---

## 10. Open items / caveats

- **v6.12 is awaiting store review** (submitted 2026-07-28) — first publish since v6.9, carrying two runs of work. Adds a **new host permission** → re-review + user notice. Nothing further to do until it clears; if it's rejected, the answers are in `extension/STORE-SUBMISSION.md`.
- **Sonnet 5's introductory API rate expires 2026-08-31** ($2/$10 → $3/$15). `prices.json`, `pricing.html` and `update-prices.js` all need the new numbers then; the caveat text should be removed at the same time.
- **Transparency Index:** env-only; pricing/data axes are ⚪. The two-scale design is intentional — don't "reconcile" xAI's 🟡-vs-🔴 by mistake (documented in `_meta.detail.note`). Colo landlords not scored yet; a couple of `power_mw` values are third-party estimates (don't change a badge).
- **Auditor caveats:** plan caps are approximate (rolling-window/compute-based limits); the per-model API cost skips models not in `prices.json.api` (undercount risk); API ≠ the product (no app/limits/features).
- **`update-prices.js` is not a real scraper** — hardcoded values, only Anthropic/OpenAI/Google; other providers change by hand.
- **The AI Clock is a modeled projection** — re-anchor quarterly.
- **`README.md`** is extension-focused and somewhat stale.
- **Google Fonts** load from `fonts.googleapis.com` on site pages (the privacy wart) — consider self-hosting.
- **Stale branches to delete:** `docs/project-context-2026-07` (superseded doc-rewrite attempt) and `feat/opus-5-and-auditor-panel` (merged in PR #18).
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
