# AI Token Tracker

A Chrome extension that tracks token usage, cost, and water consumption for your AI conversations — automatically, in a side panel, without sending your data anywhere.

Supports **Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, Copilot, Poe, and DeepSeek**.

---

## What it does

- Counts input and output tokens for every message in your conversation
- Estimates the cost in USD based on the model you select
- Shows estimated water consumption (based on published AI data centre research)
- Works in a side panel so it never interrupts your chat
- All processing is local — your conversation text never leaves your browser

---

## Supported platforms

| Platform | URL |
|---|---|
| Claude | claude.ai |
| ChatGPT | chatgpt.com |
| Gemini | gemini.google.com |
| Grok | grok.com and x.com/grok |
| Mistral | chat.mistral.ai |
| Perplexity | perplexity.ai |
| Microsoft Copilot | copilot.microsoft.com |
| Poe | poe.com |
| DeepSeek | chat.deepseek.com |

---

## Supported models

**Claude** — Haiku, Sonnet, Opus (claude.ai)

**OpenAI** — GPT-4o mini, GPT-4o, GPT-4.1, o1, o3, o3-mini, o4-mini, GPT-4 Turbo, GPT-4

**Google** — Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash Lite

**xAI** — Grok 3, Grok 3 Mini

**Mistral** — Mistral Large, Mistral Small, Codestral

**Perplexity** — Sonar Pro, Sonar

**DeepSeek** — DeepSeek V3, DeepSeek R1

---

## How to use

1. Install the extension from the Chrome Web Store
2. Navigate to any supported AI chat page
3. Click the extension icon in your toolbar to open the side panel
4. Select the model you are using from the dropdown
5. Token counts and costs update automatically as you chat

### Optional: Anthropic API key

For exact token counts on Claude conversations, you can enter an Anthropic API key in the settings panel. This is optional — without a key the extension uses a fast character-ratio estimate instead. If provided, the key is stored in session memory only and is cleared automatically when you close the browser.

---

## Privacy

**Your conversation text never leaves your device.** The extension reads text already visible on your screen and processes it locally. It makes no network requests by default.

The only exception: if you optionally provide an Anthropic API key, only the text of *your own messages* (never AI responses) is sent to Anthropic's token-counting API. No other data is transmitted under any circumstances.

Full details: [PRIVACY.md](./PRIVACY.md)

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your model preference locally on your device |
| `sidePanel` | Opens the side panel UI |
| `activeTab` | Opens the side panel for the tab you clicked on |
| `scripting` | Injects the content script into x.com only when you navigate to the Grok chat path — never on other x.com pages |
| Host permissions (claude.ai, chatgpt.com, etc.) | Required to read conversation text on each supported AI platform |

The extension does **not** request the broad `tabs` permission, which would expose all your open tabs. It only ever accesses the specific tab you are using.

---

## Reporting issues

If token counts stop working on a particular platform (AI sites sometimes change their page structure), please [open an issue](https://github.com/roryweston26-source/github.com-roryweston26-ai-token-tracker/issues) with the platform name and the date. The extension logs a warning in the browser console when it detects a scraper regression, which helps diagnose what changed.

---

## Pricing data

Prices are sourced from each provider's official pricing pages and bundled inside the extension. The last update date is recorded in `prices.json`. If you notice a price is out of date, please open an issue or submit a pull request editing that file.

---

## License

MIT
