# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-07-13._

---

## 1. What this is

**Legerly** builds privacy-first tools that give AI users information the providers don't surface — cost, environmental impact, transparency, and which plan actually fits them. One repo holds two products:

- **The Legerly website** (`legerlyai.com`) — static pages served by **GitHub Pages from `main`** (root).
- **EcoMeter AI** — a Manifest V3 **Chrome extension** in `extension/`, published to the Chrome Web Store.

**Design principles**
- **Privacy-first:** nothing is transmitted off-device except the one optional Anthropic token-count call; usage tracking is opt-in and local-only.
- **No build step, no framework, no CDN:** every page is a self-contained HTML file; fonts load from Google Fonts (the one privacy wart — see Open Items).
- **`prices.json` is the single source of truth** for model prices, shared by the extension and the website.
- **Data lives in JSON, not HTML:** each data-driven page fetches a same-origin JSON file and renders client-side, so re-grading / re-pricing is a data edit, not an HTML rewrite (`prices.json`, `clock.json`, `transparency-index.json`, `datacenters.json`, `water.json`).
- **Reactive versioning:** the publish workflow only bumps the extension version when the store rejects a duplicate — manual and automatic uploads never collide.

---

## 2. Repo layout

```
index.html                Homepage (tool cards)
pricing.html              AI Price Tracker (per-token / subscriptions / free-tier)
ai-clock.html             The AI Clock (live global-AI-usage counters)
audit.html                Subscription Auditor (quiz → plan recommendation)
transparency-index.html   AI Transparency Index (env-impact scoring + disclosure matrix)
clock.json                AI Clock anchor levels + growth rates
transparency-index.json   Page copy (_meta) + the disclosure-quality matrix (columns/rows)
datacenters.json          Per-site AI-datacenter environmental data (the scored env axis)
CNAME                     legerlyai.com
PROJECT-CONTEXT.md        (this file)

extension/                The Chrome extension (load THIS folder unpacked)
  manifest.json             MV3, version 6.10
  sidepanel.html/.js        The side-panel UI + all logic
  content.js                Scrapes visible chat text per platform
  background.js             Service worker (message routing)
  prices.json               SHARED data: { _meta, api, subscriptions, free_tiers }
  water.json                Per-model water intensity tiers
  privacy-policy.html       Privacy policy (also linked from the site)
  tokenizer_*.js            Bundled tiktoken tokenizers (lazy-loaded)
  icons/ fonts/

scripts/
  update-prices.js          Writes prices.json api section (hardcoded values)
  bump-version.js           Increments manifest version (called reactively)
  roll-clock.js             Rolls clock.json anchor forward
  validate-site.js          Pre-deploy sanity check for the static site (CI gate)
  deploy.sh

.github/workflows/
  publish.yml               Weekly: refresh prices → build → upload draft to CWS
  update-prices.yml         Manual PR-based price updates (cron disabled)
  release.yml               On push: build zip + GitHub Release + artifact
  roll-clock.yml            Quarterly: roll the AI Clock anchor, open a PR
  validate-site.yml         On PR/push to main: run validate-site.js (no-build gate)
```

---

## 3. The website (`legerlyai.com`)

Served by GitHub Pages from `main` root. **To ship a website change: merge to `main` → Pages redeploys automatically** (watch `pages-build-deployment` in Actions; hard-refresh to bust cache). Every PR into `main` first runs `validate-site.yml` (see §7).

| Page | What it does | Data source |
|---|---|---|
| `index.html` | Homepage + tool cards. Cards link the live tools (Pricing, AI Clock, Auditor, Transparency Index) and the EcoMeter store listing. | — |
| `pricing.html` | AI Price Tracker — three views: Per-token (API), Subscriptions, Free tier. | fetches `/extension/prices.json` |
| `ai-clock.html` | The AI Clock — live-ticking global AI usage/footprint counters (flows/stocks/records). | fetches `/clock.json` |
| `audit.html` | Subscription Auditor (see §6). | fetches `/extension/prices.json` |
| `transparency-index.html` | AI Transparency Index (see §7-bis). | fetches `/datacenters.json` + `/transparency-index.json` |

All pages share one dark theme (`--bg:#0a0f0d`, greens `#4caf82`/`#38c9a0`, gold `#d4a843`) and the Syne / Inter / DM Mono fonts.

---

## 4. EcoMeter AI extension

MV3 side-panel extension that tracks token usage, cost, and water impact across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, DeepSeek.

- **Store listing:** https://chromewebstore.google.com/detail/ecometer-ai-%E2%80%94-resource-tr/angbjmkjocdkfdppnpoemfkdjphenbbj (extension ID `angbjmkjocdkfdppnpoemfkdjphenbbj`).
- **Model picker:** full catalog (all models, incl. advanced/paid) so paid users can attribute frontier-model chats. Built in `buildModelDropdown()` from `MODEL_CATALOG`; prices resolved from `prices.json` `api`.
- **Usage tracking (opt-in, local, feeds the Auditor):** see §6.

---

## 5. Shared & site data files

### `extension/prices.json` — the single source of truth
```jsonc
{
  "_meta": { "last_updated", "version", "source" },
  "api":   { "<provider>": { "<model-key>": { "input": <$/token>, "output": <$/token> } } },
  "subscriptions": [ { "p": "<provider>", "m": "<plan name>", "price": <usd/mo>, "note"? } ],
  "free_tiers":    { "<provider>": { "label", "note", "models": [ { "key", "name", "note"? } ] } }
}
```
Consumed by: the extension (`api` → cost), `pricing.html` (all three sections), `audit.html` (prices + free-tier model access).

Notable prices: Claude Sonnet 5 `$2/$10` (free default), Fable 5 & Mythos 5 `$10/$50` (paid); gemini-3.5-flash corrected to `$0.50/$3.00`.

### `clock.json` — AI Clock model
`{ _meta: { anchor, last_rolled }, scenarios: { conservative|moderate|high }, rates }`. **Re-anchored 2026-07-12 (Q3)** — the model is a two-force projection (volume up, per-unit cost down). Meant to be **re-anchored quarterly** — `roll-clock.yml` does the mechanical roll and opens a PR for a human to drop in fresh disclosures.

### `transparency-index.json` — AI Transparency Index page copy + disclosure matrix
`{ _meta, columns, rows }`. `_meta` carries **page-level** copy (title, lede, `last_verified`, the 4-state `grade_legend`, `axes`, `methodology`, `caveats`) **plus** a nested `detail` block (its own 3-state legend + note + caveats) that labels the matrix. `columns`/`rows` are the 7-provider × 6-dimension **disclosure-quality matrix**. See §7-bis.

### `datacenters.json` — per-site AI-datacenter environmental data
`{ _meta: { last_updated, methodology_note }, sites: [...] }`. Each site: `provider`, `name`, `location`, `power_mw` (+ optional `power_mw_planned`), `water_grade` (transparent|partial|opaque), `water_note`, `sources[]`, `as_of`. `transparency-index.html` computes each provider's grade from this file client-side. See §7-bis.

### `water.json` — per-model water intensity tiers (extension only)
Per-**token** model intensity (conservative vs academic scope). Distinct from `datacenters.json`, which is per-**facility**.

---

## 6. The Subscription Auditor + EcoMeter loop (marquee feature)

**`audit.html`** — a client-side quiz that recommends the plan/tier/free option that fits real usage.

- **10 questions:** 7 usage (tools, frequency, messages/day, purpose, limits hit, need-frontier, media) → a **5-level classification** (Dabbler → Casual → Regular → Heavy → Power user); 3 current-spend (what you pay, solo/team, priority).
- **Engine** (`recommend()`): for each provider you use, picks the cheapest tier that clears your **volume** (with a limit-hit headroom factor) and **model access**, then:
  - flags over/under-payment vs. what you pay now (with $/yr savings),
  - **volume-aware downgrade:** if a paid tier is needed *only* for an advanced model but your volume fits the free tier and API pay-as-you-go is cheaper, it recommends **"free tier + API"**,
  - shows API-cost context, and a cross-provider note for media generation.
- **Plan metadata** (caps/models/features/seats) is **inline in `audit.html`** (approximate); **prices sync live** from `prices.json`, and free-tier model lists sync from `free_tiers`.

**EcoMeter → Auditor data path**
1. In the extension, the user opts into **"Usage tracking"** (📊 panel, **off by default**).
2. `accumulateUsage()` keeps a **local, lifetime** tally per platform/model — **counts + tokens only, no message content**.
3. **⤓ Export for Auditor** downloads `ecometer-usage.json` (a local file).
4. In `audit.html`, **Connect usage** reads that file **entirely in-browser** (FileReader — never uploaded), pre-fills the quiz with measured models/volume.

**`ecometer-usage.json` schema**
```jsonc
{ "app":"EcoMeter AI", "kind":"usage-export", "version":1, "scope":"lifetime",
  "generated":"YYYY-MM-DD", "days_tracked":N,
  "platforms":[ { "provider", "messages_per_day", "input_tokens_per_day",
                  "output_tokens_per_day", "total_messages", "active_days", "models_used":[...] } ] }
```

---

## 7. Automation (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `publish.yml` | Mon 09:15 UTC + manual | Refresh prices → if changed, build the extension → upload to CWS as a **draft** → commit + tag + open a "ready to publish" issue. **Reactive versioning:** uploads the current manifest version; only bumps (via `bump-version.js`) and retries on `PKG_INVALID_VERSION_NUMBER`. |
| `update-prices.yml` | Manual only (cron disabled) | PR-based price refresh. |
| `release.yml` | Push to `main` | Build zip + GitHub Release + 30-day artifact. |
| `roll-clock.yml` | Quarterly (1st of Jan/Apr/Jul/Oct) + manual | Roll `clock.json` anchor to today, open a PR with a re-anchor checklist. Last roll: 2026-07-12. |
| `validate-site.yml` | PR into `main` (on `**.html`/`**.json`/the script) + push to `main` + manual | Runs `scripts/validate-site.js`: the no-build gate. Zero-dependency; flags only unambiguously broken things (missing `<!doctype>`, unbalanced `<script>`/`<style>`/comment tags, broken local `href`/`src`/`fetch()` refs, malformed referenced JSON) so it never blocks a good merge. |

**Secrets** (repo → Settings → Secrets): `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`. ⚠️ The Google OAuth **consent screen must be in "Production"** or the refresh token expires every 7 days.

---

## 7-bis. The AI Transparency Index (`transparency-index.html`)

Grades **how openly** each provider lets the public see what its AI costs — transparency, not the underlying footprint. Three **independent** axes, never averaged into one score:

| Axis | Status |
|---|---|
| **Environmental impact** | **Scored** (per-site, capacity-weighted — below) |
| Pricing | ⚪ Not yet scored (criteria undefined) |
| Data practices | ⚪ Not yet scored (criteria undefined) |

**Two coexisting scales — this is deliberate, not a bug.** The page grades on **public knowability**, so it runs a **4-state** scale: 🟢 Transparent (company discloses itself) · 🟡 Partial (a real figure is public, but only via a regulator/utility/watchdog — not the company) · 🔴 Opaque (nothing public) · ⚪ Not yet assessed. Under this, e.g. **xAI's Memphis water reads 🟡** because MLGW utility records exist, even though xAI disclosed nothing itself.

Nested **below** the environmental summary is the older **"Disclosure quality by dimension"** matrix (7 providers × 6 dimensions), which keeps its **own narrower 3-state legend** (🟢 good disclosure / 🟡 partial / 🔴 none), because it grades a company's **own self-reporting completeness**, not knowability. So the same provider can read 🟡 in the top view and 🔴 in the matrix — the matrix's lead-in note explains the different lens. The matrix rows were **not** re-graded when the page adopted the knowability scale.

**Scoring (computed client-side from `datacenters.json`, in `renderEnv()`):**
- `water_grade` → value: transparent = 3, partial = 2, opaque = 1. Sites with **no** grade are **excluded** (not treated as 0/opaque).
- `providerScore = Σ(value × power_mw) / Σ(power_mw)` over that provider's assessed sites **with a non-null `power_mw`**. Null-MW sites still **display** with their own grade but don't move the average.
- Badge buckets: ≥ 2.5 🟢 · 1.5–2.49 🟡 · < 1.5 🔴 · no assessed sites ⚪.
- Each provider card is a `<details>` with a **"Show the math"** expand — sites, weights, grades, and the division shown explicitly (transparency is the point). Every site links its sources.

**Data model split:** page copy (methodology, legend, caveats, axes) + the nested matrix live in `transparency-index.json._meta` / `.columns` / `.rows`; the scored per-site data lives in `datacenters.json`. The page does two same-origin fetches; each has an independent failure fallback.

Current coverage: **5 sites across 4 providers** (Meta, xAI ×2, Amazon/Anthropic "Project Rainier", Microsoft). `last_verified: 2026-07-12`.

---

## 8. Recent work / working state (as of 2026-07-13)

**Shipped (merged to `main`):**
- **AI Transparency Index** — scaffold + homepage tool card, then the environmental-disclosure scorecard (the 7×6 disclosure-quality matrix). (PRs #9-scaffold path, #10.)
- **Subscription Auditor + EcoMeter export** — full build; opt-in lifetime usage tracking that feeds the Auditor; usage-accumulation hardening + model-picker hint. (PR #11.)
- **AI Clock** — Q3 re-anchor to 2026-07-12 (`chore: re-anchor AI Clock for 2026 Q3`).
- Earlier: publish-workflow fix + reactive versioning; `prices.json` restructure (api/subscriptions/free_tiers) + free-tier data + new models; homepage link cleanup.

**In progress / on branch `chore/clock-reanchor-2026-q3`, not yet committed:**
- **Transparency Index — environmental-impact axis:** new `datacenters.json`; `transparency-index.html` extended with the capacity-weighted `renderEnv()` engine, the three-axis strip, and the nested-matrix restructure; `transparency-index.json._meta` reworked to page-level (4-state legend, new methodology + caveats, `detail` block). Adopted the **public-knowability** scale page-wide and **nested** (not replaced) the existing matrix. Verified live (correct badges + math, no console errors); awaiting review/commit by Rory.
- **`validate-site` CI gate** (`scripts/validate-site.js` + `.github/workflows/validate-site.yml`) — untracked, pending commit.

Extension is at **v6.10** locally.

---

## 9. Open items / caveats

- **Transparency Index coverage is small** (5 sites / 4 providers) and env-only. **Google** and **OpenAI** appear in the nested matrix but not the top per-site view, so a reader sees 7 providers below and 4 above — the caveats explain the coverage gap, but the asymmetry is worth revisiting. Pricing and data-practices axes are ⚪ until criteria are defined.
- **The two-scale design is intentional** but subtle — a future editor might "fix" the xAI 🟡-vs-🔴 mismatch by mistake. The distinction (public knowability vs. company self-reporting) is documented in `transparency-index.json._meta.detail.note` and in-page.
- **Plan caps in `audit.html` are approximate** (researched Jul 2026; Gemini/Copilot are compute/priority-based with no fixed daily count). Re-verify periodically. Model access is authoritative via `prices.json`.
- **`update-prices.js` is not a real scraper** — hardcoded values, only Anthropic/OpenAI/Google. xAI/Mistral/Perplexity/DeepSeek prices change only by hand.
- **The AI Clock is a modeled projection**, not measured — re-anchor quarterly (roll-clock PR) so it doesn't drift.
- **`README.md`** is extension-focused and somewhat stale (model list; "Chrome Web Store: coming soon" though it's now live).
- **`update-prices.yml`** references two step outputs it never sets (`date`, `diff_summary`) — cosmetic, harmless since it's manual-only.
- **Google Fonts** are loaded from `fonts.googleapis.com` on every website page (now including `transparency-index.html`), which slightly undercuts the "no IP leak to Google" stance the extension holds (extension self-hosts fonts). Consider self-hosting site fonts too.
- **The EcoMeter export reaches users only on the next store publish** (v6.10+). Until then, users on older versions have no export button.

---

## 10. How to ship

- **Website change:** open a PR into `main` (triggers `validate-site.yml`) → merge → GitHub Pages redeploys.
- **Extension change (automatic):** `publish.yml` on Monday (or manual dispatch) uploads a draft to the store + opens an issue; you click **Publish** in the dashboard.
- **Extension change (manual):** zip the **contents** of `extension/` (manifest.json at the zip root) → Chrome Web Store Developer Dashboard → your item → Package → Upload new package → Submit for review. ⚠️ If a prior version is still "Pending review," the store blocks new uploads until it clears (or you cancel that review).
