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
| Anthropic | Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 / 4.7 / 4.8 |
| Google | Gemini 3.5 Flash, 3.1 Pro, 3.1 Flash-Lite, 2.5 Pro / Flash / Flash-Lite |
| OpenAI | GPT-5.5, GPT-5.4, GPT-4o, GPT-4.1, o3, o4-mini |
| xAI | Grok 4, Grok 3, Grok 3 Mini |
| Mistral | Large 3, Medium 3, Small 3, Codestral |
| Perplexity | Sonar Pro, Sonar, Sonar Reasoning Pro |
| DeepSeek | V3, R1 |

## Installation

### From source (developer mode)

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `extension/` folder
5. Click the EcoMeter AI icon in your toolbar to open the side panel

### From the Chrome Web Store

*Coming soon.*

## Project Structure

```
ecometer-ai/
├── extension/          # The Chrome extension (load this folder in Chrome)
│   ├── manifest.json
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── background.js
│   ├── content.js
│   ├── prices.json     # Auto-updated weekly via GitHub Actions
│   ├── water.json
│   ├── icons/
│   ├── fonts/
│   ├── tokenizer_cl100k.js
│   └── tokenizer_o200k.js
├── scripts/
│   └── update-prices.js  # Price updater script (runs in CI)
└── .github/
    └── workflows/
        ├── update-prices.yml   # Weekly price sync → opens PR
        └── release.yml         # On push to main → builds zip release
```

## Pricing Updates

`prices.json` is updated automatically every Monday via GitHub Actions. The workflow fetches current pricing from official provider pages and opens a pull request if anything has changed. You review and merge — nothing ships without your approval.

To update prices manually:
```bash
node scripts/update-prices.js
```

## Contributing

Issues and PRs welcome. For pricing corrections, the source of truth is:
- Google: https://ai.google.dev/gemini-api/docs/pricing
- Anthropic: https://www.anthropic.com/pricing
- OpenAI: https://openai.com/api/pricing

## License

MIT © Legerly
