# EcoMeter AI — Resource Tracker

**Track token usage, cost, and environmental impact across your AI conversations — automatically.**

EcoMeter AI is a Manifest V3 Chrome extension with a side-panel UI that tracks token usage, cost, and water impact in real time across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, and DeepSeek. No account required — everything runs locally in your browser.

It also feeds Legerly's **Subscription Auditor**. With opt-in, local, lifetime usage tracking enabled, the extension accumulates message counts and token volume per platform/model (no message content). The **⤓ Export for Auditor** button downloads this as `ecometer-usage.json`. The Auditor ([`audit.html`](https://legerlyai.com/audit.html)) reads that file client-side via FileReader — never uploaded anywhere — and pre-fills its quiz with measured usage instead of self-reported estimates, so its recommendation engine works off real volume data.

---

## Why Legerly

AI runs on **asymmetric information**: providers know exactly what each conversation costs — in dollars, energy, and water — and structure things so you don't. That gap is a market failure, and it's helping AI concentrate wealth rather than spread it. [Legerly](https://legerlyai.com) builds privacy-first, ad-free tools that hand that information back to the people using AI, so the benefit flows to them. EcoMeter AI is one of those tools; the full set (AI Price Tracker, the AI Clock, Subscription Auditor, AI Transparency Index) lives at [legerlyai.com](https://legerlyai.com).

## What else is in this repo

This repo holds two products. EcoMeter AI (`extension/`) is the one this README is about; the rest of the tree is the **Legerly website**, four self-contained static pages served straight to GitHub Pages from `main`:

| Page | What it does |
|---|---|
| `pricing.html` | AI Price Tracker — per-token rates, subscriptions, free tiers, plus what a plan is actually worth |
| `audit.html` | Subscription Auditor — which plan fits your real usage, and the student/teacher routes that genuinely exist |
| `ai-clock.html` | The AI Clock — modelled global AI usage and footprint counters (a projection, re-anchored quarterly) |
| `transparency-index.html` | AI Transparency Index — how openly each provider discloses its environmental impact |

They share `extension/prices.json` as the single source of truth for prices, which is what ties the extension to the site: EcoMeter measures your real local usage, the Auditor prices it.

**Two docs carry the context:** [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) is the architecture and how-to-ship deep dive, and [`FRESHNESS.md`](FRESHNESS.md) lists everything in here that goes stale — prices, plan caps, student offers, clock anchors, DOM selectors, store state — with the check that proves each one.

**Seven guard scripts**, four of them in CI. Run them after touching data:

```bash
node scripts/check-prices.js && node scripts/check-auditor.js && node scripts/test-auditor.js && node scripts/check-clock.js && node scripts/test-cost-model.js && node scripts/calibrate-tokenizer.js && node scripts/validate-site.js
```

Each exists because something was wrong and nothing caught it. They have found a 2× billing error, a 51× image-token error, a false accuracy claim, prices drifting between six files, and a recommendation that sent image users to a tier that throttles image generation.

---

## Features

- **Token counting** — exact where a real tokenizer applies (bundled cl100k / o200k, or an opt-in provider count API); ±11% on the character-ratio estimator, which is a *measured* figure, not a guess. The panel labels which method produced each number.
- **Cost estimation** — live per-message and session totals across all major models
- **Water footprint** — conservative and full-scope estimates per conversation
- **Multi-platform** — Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, DeepSeek, Copilot, Poe
- **Optional API keys** — add an Anthropic key for exact Claude counts, or a Google key for exact Gemini counts. Both are **off by default**, each is activated only by adding that key, and each sends only your own message text to that provider's token-count endpoint. Everything works without either.
- **Privacy first** — nothing leaves your browser except the two opt-in token-count calls above. No telemetry, no analytics, no remote logging. Usage tracking is opt-in, local-only and deletable. The extension self-hosts its fonts; the website still loads Google Fonts, which is a known wart we are not extending.

## Supported Models

| Provider | Models |
|---|---|
| Anthropic | Claude Opus 5, Opus 4.8 / 4.7 / 4.6, Sonnet 5, Sonnet 4.6, Haiku 4.5, plus Fable 5 & Mythos 5 |
| Google | Gemini 3.5 Flash, 3.1 Pro, 3.1 Flash-Lite, 2.5 Pro / Flash / Flash-Lite |
| OpenAI | GPT-5.5, GPT-5.4 (+ mini), GPT-4o, GPT-4.1, o3, o4-mini |
| xAI | Grok 4.3, Grok 4.20, Grok 4, Grok 3, Grok 3 Mini |
| Mistral | Large 3, Medium 3.5, Small 4, Codestral |
| Perplexity | Sonar Pro, Sonar, Sonar Reasoning Pro |
| DeepSeek | V4 Pro, V4 Flash, V3, R1 |

The full catalog (including advanced/paid frontier models) lives in [`extension/prices.json`](extension/prices.json) — the single source of truth for pricing, shared by the extension and the Legerly website.

## Installation

### From source (developer mode)

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `extension/` folder
5. Click the EcoMeter AI icon in your toolbar to open the side panel

### From the Chrome Web Store

Install the published extension directly: **[EcoMeter AI on the Chrome Web Store](https://chromewebstore.google.com/detail/ecometer-ai-%E2%80%94-resource-tr/angbjmkjocdkfdppnpoemfkdjphenbbj)**.

## Project Structure

```
ecometer-ai/
├── extension/          # The Chrome extension (load this folder in Chrome)
│   ├── manifest.json     # MV3 (version is bumped reactively — see scripts/bump-version.js)
│   ├── sidepanel.html
│   ├── sidepanel.js      # Side-panel UI + all logic
│   ├── background.js
│   ├── content.js        # Scrapes visible chat text per platform
│   ├── prices.json       # SHARED source of truth: api / subscriptions / free_tiers
│   ├── water.json        # Per-model water intensity tiers
│   ├── privacy-policy.html
│   ├── icons/
│   ├── fonts/            # Self-hosted (no IP leak to Google Fonts)
│   ├── tokenizer_cl100k.js
│   └── tokenizer_o200k.js
├── scripts/
│   ├── update-prices.js  # Writes the prices.json api section
│   ├── bump-version.js   # Increments manifest version (reactive, on store collision)
│   └── roll-clock.js     # Rolls the AI Clock anchor forward
└── .github/
    └── workflows/
        ├── publish.yml         # Weekly: refresh prices → build → upload draft to Chrome Web Store
        ├── update-prices.yml   # Manual: PR-based price refresh
        ├── release.yml         # On push to main → builds zip + GitHub Release
        └── roll-clock.yml      # Quarterly: re-anchor the AI Clock, open a PR
```

This repo also hosts the **[Legerly website](https://legerlyai.com)** (`index.html`, `pricing.html`, `ai-clock.html`, `audit.html`, `transparency-index.html`) served by GitHub Pages from `main`.

## Pricing Updates

The weekly `publish.yml` workflow (Monday) refreshes `prices.json` as part of building and uploading the extension draft to the Chrome Web Store. A separate `update-prices.yml` can be run manually to open a PR with just a price refresh. Either way you review and merge — nothing ships without your approval.

To update prices locally:
```bash
node scripts/update-prices.js
```

> **Note:** `update-prices.js` currently writes hardcoded values and only covers Anthropic, OpenAI, and Google. Other providers' prices in `prices.json` are maintained by hand.

## Contributing

Issues and PRs welcome. For pricing corrections, the source of truth is:
- Google: https://ai.google.dev/gemini-api/docs/pricing
- Anthropic: https://www.anthropic.com/pricing
- OpenAI: https://openai.com/api/pricing

## License

MIT © Legerly
