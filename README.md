# EcoMeter AI — Resource Tracker

**Track token usage, cost, and environmental impact across your AI conversations — automatically.**

EcoMeter AI is a Manifest V3 Chrome extension with a side-panel UI that tracks token usage, cost, and water impact in real time across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, and DeepSeek. No account required — everything runs locally in your browser.

It also feeds Legerly's **Subscription Auditor**. With opt-in, local, lifetime usage tracking enabled, the extension accumulates message counts and token volume per platform/model (no message content). The **⤓ Export for Auditor** button downloads this as `ecometer-usage.json`. The Auditor ([`audit.html`](https://legerlyai.com/audit.html)) reads that file client-side via FileReader — never uploaded anywhere — and pre-fills its quiz with measured usage instead of self-reported estimates, so its recommendation engine works off real volume data.

---

## Features

- **Token counting** — accurate to ±10–15% using local tokenizers (cl100k, o200k)
- **Cost estimation** — live per-message and session totals across all major models
- **Water footprint** — conservative and full-scope estimates per conversation
- **Multi-platform** — Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, DeepSeek, Copilot, Poe
- **Optional API key** — connect your Anthropic key for exact token counts on Claude; everything else works without one
- **Privacy first** — no data leaves your browser; fonts self-hosted to avoid IP leaks to Google Fonts

## Supported Models

| Provider | Models |
|---|---|
| Anthropic | Claude Opus 4.8 / 4.7 / 4.6, Sonnet 5, Sonnet 4.6, Haiku 4.5, plus Fable 5 & Mythos 5 |
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
│   ├── manifest.json     # MV3, current version 6.10
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
