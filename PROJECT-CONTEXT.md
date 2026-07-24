# Legerly — Project Context

_A handoff/context reference for the Legerly project (website + EcoMeter AI extension). Last updated 2026-07-10._

---

## 1. What this is

**Legerly** builds privacy-first tools that give AI users information the providers don't surface — cost, environmental impact, and which plan actually fits them. One repo holds two products:

- **The Legerly website** (`legerlyai.com`) — static pages served by **GitHub Pages from `main`** (root).
- **EcoMeter AI** — a Manifest V3 **Chrome extension** in `extension/`, published to the Chrome Web Store.

**Design principles**
- **Privacy-first:** nothing is transmitted off-device except the one optional Anthropic token-count call; usage tracking is opt-in and local-only.
- **No build step, no framework, no CDN:** every page is a self-contained HTML file; fonts load from Google Fonts (the one privacy wart — see Open Items).
- **`prices.json` is the single source of truth** for model prices, shared by the extension and the website.
- **Reactive versioning:** the publish workflow only bumps the extension version when the store rejects a duplicate — manual and automatic uploads never collide.

---

## 2. Repo layout

```
index.html            Homepage (tool cards)
pricing.html          AI Price Tracker (per-token / subscriptions / free-tier)
ai-clock.html         The AI Clock (live global-AI-usage counters)
audit.html            Subscription Auditor (quiz → plan recommendation)
clock.json            AI Clock anchor levels + growth rates
CNAME                 legerlyai.com
PROJECT-CONTEXT.md    (this file)

extension/            The Chrome extension (load THIS folder unpacked)
  manifest.json         MV3, version 6.10
  sidepanel.html/.js    The side-panel UI + all logic
  content.js            Scrapes visible chat text per platform
  background.js         Service worker (message routing)
  prices.json           SHARED data: { _meta, api, subscriptions, free_tiers }
  water.json            Per-model water intensity tiers
  privacy-policy.html   Privacy policy (also linked from the site)
  tokenizer_*.js        Bundled tiktoken tokenizers (lazy-loaded)
  icons/ fonts/

scripts/
  update-prices.js      Writes prices.json api section (hardcoded values)
  bump-version.js       Increments manifest version (called reactively)
  roll-clock.js         Rolls clock.json anchor forward
  deploy.sh

.github/workflows/
  publish.yml           Weekly: refresh prices → build → upload draft to CWS
  update-prices.yml     Manual PR-based price updates (cron disabled)
  release.yml           On push: build zip + GitHub Release + artifact
  roll-clock.yml        Quarterly: roll the AI Clock anchor, open a PR
```

---

## 3. The website (`legerlyai.com`)

Served by GitHub Pages from `main` root. **To ship a website change: merge to `main` → Pages redeploys automatically** (watch `pages-build-deployment` in Actions; hard-refresh to bust cache).

| Page | What it does | Data source |
|---|---|---|
| `index.html` | Homepage + tool cards. EcoMeter card links to the real store listing; "coming soon" tiles (Context Window Calculator, AI Pricing Index) are non-clickable. | — |
| `pricing.html` | AI Price Tracker — three views: Per-token (API), Subscriptions, Free tier. | fetches `/extension/prices.json` |
| `ai-clock.html` | The AI Clock — live-ticking global AI usage/footprint counters (flows/stocks/records). | fetches `/clock.json` |
| `audit.html` | Subscription Auditor (see §6). | fetches `/extension/prices.json` |

---

## 4. EcoMeter AI extension

MV3 side-panel extension that tracks token usage, cost, and water impact across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, DeepSeek.

- **Store listing:** https://chromewebstore.google.com/detail/ecometer-ai-%E2%80%94-resource-tr/angbjmkjocdkfdppnpoemfkdjphenbbj (extension ID `angbjmkjocdkfdppnpoemfkdjphenbbj`).
- **Model picker:** full catalog (all models, incl. advanced/paid) so paid users can attribute frontier-model chats. Built in `buildModelDropdown()` from `MODEL_CATALOG`; prices resolved from `prices.json` `api`.
- **Tokenizer accuracy** (`countTokens` / `getEncodingForModel`): OpenAI & Copilot use bundled **tiktoken** (exact); Claude uses the opt-in Anthropic **count API** (exact) else a cl100k proxy; Gemini/DeepSeek/Mistral/Grok/Perplexity use tiktoken proxies or calibrated char-ratio/SentencePiece estimators. Every count carries an error band (`METHOD_ACCURACY` → `m.err`) surfaced as **±X%** in the stats. The char-ratio & SP estimators were **recalibrated 2026** against real tiktoken on a mixed corpus (MAE ~32%/+31% bias → ~8%/~0 bias); and `getEncodingForModel` was fixed so **GPT-5.x maps to o200k** (it was falling through to char-ratio — a ~30% overcount on ChatGPT/Copilot). **Planned (not yet built):** opt-in provider tokenizer APIs (Google flagship) and bundled DeepSeek/Tekken/Gemma tokenizers for exact local counts.
- **Usage tracking (opt-in, local, feeds the Auditor):** see §6.

---

## 5. Shared data files

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
`{ _meta: { anchor, last_rolled }, scenarios: { conservative|moderate|high }, rates }`. Anchored **Jan 1 2026**; the model is a two-force projection (volume up, per-unit cost down). Meant to be **re-anchored quarterly** — `roll-clock.yml` does the mechanical roll and opens a PR for a human to drop in fresh disclosures.

### `water.json` — per-model water intensity tiers (extension only).

---

## 6. The Subscription Auditor + EcoMeter loop (the marquee feature)

**`audit.html`** — a client-side quiz that recommends the plan/tier/free option that fits real usage.

- **10 questions:** 7 usage (tools, frequency, messages/day, purpose, limits hit, need-frontier, media) → a **5-level classification** (Dabbler → Casual → Regular → Heavy → Power user); 3 current-spend (what you pay, solo/team, priority).
- **Engine** (`recommend()`): for each provider you use, picks the cheapest tier that clears your **volume** (with a limit-hit headroom factor) and **model access**, then:
  - flags over/under-payment vs. what you pay now (with $/yr savings),
  - **volume-aware downgrade:** if a paid tier is needed *only* for an advanced model but your volume fits the free tier and API pay-as-you-go is cheaper, it recommends **"free tier + API"** (e.g. "you use Opus twice a term → drop the plan, pay pennies via API"),
  - shows API-cost context, and a cross-provider note for media generation.
- **Plan metadata** (caps/models/features/seats) is **inline in `audit.html`** (auditor-specific, approximate); **prices sync live** from `prices.json`, and free-tier model lists sync from `free_tiers`.

**EcoMeter → Auditor data path**
1. In the extension, the user opts into **"Usage tracking"** (📊 panel, **off by default**).
2. `accumulateUsage()` keeps a **local, lifetime** tally per platform/model — **counts + tokens only, no message content**. Uses per-conversation running totals + delta accumulation, so streaming replies count once and reopening a chat adds nothing.
3. **⤓ Export for Auditor** downloads `ecometer-usage.json` (a local file).
4. In `audit.html`, **Connect usage** reads that file **entirely in-browser** (FileReader — never uploaded), pre-fills the quiz with measured models/volume, and the engine uses the real numbers.

**`ecometer-usage.json` schema**
```jsonc
{ "app":"EcoMeter AI", "kind":"usage-export", "version":1, "scope":"lifetime",
  "generated":"YYYY-MM-DD", "days_tracked":N,
  "platforms":[ { "provider", "messages_per_day", "input_tokens_per_day",
                  "output_tokens_per_day", "total_messages", "active_days", "models_used":[...] } ] }
```
Volume is averaged **per active day** ("on a day you use it"); **lifetime** (not a recent window) so infrequent-but-real advanced-model use still shows up.

---

## 7. Automation (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `publish.yml` | Mon 09:15 UTC + manual | Refresh prices → if changed, build the extension → upload to CWS as a **draft** → commit + tag + open a "ready to publish" issue. **Reactive versioning:** uploads the current manifest version; only bumps (via `bump-version.js`) and retries if the store returns `PKG_INVALID_VERSION_NUMBER`. |
| `update-prices.yml` | Manual only (cron disabled) | PR-based price refresh. |
| `release.yml` | Push to `main` | Build zip + GitHub Release + 30-day artifact. (CWS upload removed — that's `publish.yml`'s job.) |
| `roll-clock.yml` | Quarterly (1st of Jan/Apr/Jul/Oct) + manual | Roll `clock.json` anchor to today, open a PR with a re-anchor checklist. |

**Secrets** (repo → Settings → Secrets): `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`. ⚠️ The Google OAuth **consent screen must be in "Production"** or the refresh token expires every 7 days.

---

## 8. What we built this session (summary)

1. **Fixed the weekly publish workflow** — was failing on `PKG_INVALID_VERSION_NUMBER` (version never bumped). Now auto-bumps + uploads a draft + notifies; later made **reactive** (bump only on collision) so manual/auto never double-bump.
2. **Restructured `prices.json`** into `api` / `subscriptions` / `free_tiers`; updated both consumers (extension + `pricing.html`).
3. **Free-tier data + new models** — Sonnet 5, Fable 5, Mythos 5; corrected Gemini Flash pricing.
4. **Homepage cleanup** — real store links everywhere; dead "coming soon" links made non-clickable.
5. **The AI Clock** — rebuilt the data model on a Jan 1 2026 research anchor; externalized to `clock.json`; added quarterly auto-re-anchor (`roll-clock.yml`).
6. **Subscription Auditor** — full build: page, engine, 5 usage levels, research-grounded plan caps.
7. **EcoMeter usage export** — opt-in, local, lifetime tracking that feeds the Auditor (the measure→recommend loop).
8. **Privacy** — made usage tracking opt-in + easy-delete; reconciled the privacy policy.

Merged PRs: workflow fix, shared-data/free-tier, homepage links, AI Clock model. **Pending:** `feat/subscription-auditor` (Auditor + EcoMeter export + reactive versioning + opt-in tracking + lifetime export). Extension is at **v6.10** locally; **v6.8** is/was in Web Store review.

---

## 9. Open items / caveats

- **Plan caps in `audit.html` are approximate** (researched Jul 2026 from published rolling-window limits; Gemini/Copilot are compute/priority-based with no fixed daily count). Re-verify periodically. Model access is authoritative via `prices.json`.
- **`update-prices.js` is not a real scraper** — it writes hardcoded values and only covers Anthropic/OpenAI/Google. xAI/Mistral/Perplexity/DeepSeek prices in `prices.json` change only by hand. A genuine scraper (or maintained source) is future work.
- **The AI Clock is a modeled projection**, not measured — re-anchor quarterly (roll-clock PR) so it doesn't drift.
- **`README.md`** is extension-focused and somewhat stale (model list; "Chrome Web Store: coming soon" though it's now live).
- **`update-prices.yml`** references two step outputs it never sets (`date`, `diff_summary`) — cosmetic (empty PR title/body), harmless since it's manual-only.
- **Google Fonts** are loaded from `fonts.googleapis.com` on the website pages, which slightly undercuts the "no IP leak to Google" stance the extension holds (extension self-hosts fonts). Consider self-hosting site fonts too.
- **The EcoMeter export reaches users only on the next store publish** (v6.10+). Until then, users on older versions have no export button.

---

## 10. How to ship

- **Website change:** merge to `main` → GitHub Pages redeploys.
- **Extension change (automatic):** `publish.yml` on Monday (or manual dispatch) uploads a draft to the store + opens an issue; you click **Publish** in the dashboard.
- **Extension change (manual):** zip the **contents** of `extension/` (manifest.json at the zip root) → Chrome Web Store Developer Dashboard → your item → Package → Upload new package → Submit for review. ⚠️ If a prior version is still "Pending review," the store blocks new uploads until it clears (or you cancel that review).
