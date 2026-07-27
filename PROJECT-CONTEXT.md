# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-07-13._

> Read **CLAUDE.md** first (mission, principles, voice — auto-loaded). This is the deep dive.

---

## 0. Working state (read this first) — as of 2026-07-13

**Everything from this run is now merged to `main`** (2026-07-13):
- **AI Transparency Index** — full env-impact scoring, 12 sites / 7 providers (§7).
- **EcoMeter tokenizer accuracy** — recalibration, GPT-5 routing fix, error bands, **opt-in Google `countTokens`**, exact-local scaffold, publish-time asset staging (§4).
- **Subscription Auditor — per-model cost** + generalised "any tier + API" downgrade (§6).
- **EcoMeter export — `model_usage[]`** per-model token split (§6).
- **`validate-site` CI gate** (§8).
- Everything from the prior session (workflow fix, `prices.json` restructure, AI Clock, Subscription Auditor base, EcoMeter usage export, mission docs / CLAUDE.md).

Leftover branch to delete: `docs/project-context-2026-07` (a superseded doc-rewrite attempt).

**Ship status:** extension is **v6.10** on `main`; the tokenizer + Google-API + `model_usage` work reaches users only on the **next store publish** (§10) — which also surfaces a **new host permission** (`generativelanguage.googleapis.com`) for re-review. Website changes (Transparency Index, Auditor per-model cost) deployed on merge. **Before publishing the extension, smoke-test in Chrome** (the accuracy line, the Google-key path, and that exact-local stays off with no assets) — those weren't runtime-testable outside Chrome.

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
  manifest.json             MV3, version 6.10  (host perms incl. generativelanguage.googleapis.com)
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

---

## 5. Shared & site data files

### `extension/prices.json` — single source of truth
```jsonc
{ "_meta": { "last_updated", "version", "source" },
  "api":   { "<provider>": { "<model-key>": { "input": <$/token>, "output": <$/token> } } },
  "subscriptions": [ { "p", "m", "price", "note"? } ],
  "free_tiers":    { "<provider>": { "label", "note", "models": [ { "key", "name", "note"? } ] } } }
```
Consumed by the extension (`api` → cost), `pricing.html` (all sections), `audit.html` (prices + free-tier access).

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

---

## 10. Open items / caveats

- **Extension not yet published** with the tokenizer + Google-API work — needs a store publish (§ below); adds a **new host permission** → re-review + user notice.
- **Transparency Index:** env-only; pricing/data axes are ⚪. The two-scale design is intentional — don't "reconcile" xAI's 🟡-vs-🔴 by mistake (documented in `_meta.detail.note`). Colo landlords not scored yet; a couple of `power_mw` values are third-party estimates (don't change a badge).
- **Auditor caveats:** plan caps are approximate (rolling-window/compute-based limits); the per-model API cost skips models not in `prices.json.api` (undercount risk); API ≠ the product (no app/limits/features).
- **`update-prices.js` is not a real scraper** — hardcoded values, only Anthropic/OpenAI/Google; other providers change by hand.
- **The AI Clock is a modeled projection** — re-anchor quarterly.
- **`README.md`** is extension-focused and somewhat stale.
- **Google Fonts** load from `fonts.googleapis.com` on site pages (the privacy wart) — consider self-hosting.
- **Stale branch:** `docs/project-context-2026-07` was a superseded doc-rewrite attempt — discard it.

---

## 11. How to ship

- **Website change:** open a PR into `main` (runs `validate-site.yml` once merged) → merge → GitHub Pages redeploys.
- **Extension change (automatic):** Actions → **Weekly Publish → Run workflow** (a manual run force-builds even without a price change) → uploads a draft + opens an issue → click **Publish** in the [dashboard](https://chrome.google.com/webstore/devconsole). Reactive versioning bumps `6.10` only if the store rejects it as a duplicate.
- **Extension change (manual):** bump the manifest version, zip the **contents** of `extension/` (manifest at zip root), upload in the CWS dashboard. ⚠️ If a prior version is "Pending review," the store blocks new uploads until it clears.
- `gh` is **not** installed locally — open/merge PRs in the browser.
