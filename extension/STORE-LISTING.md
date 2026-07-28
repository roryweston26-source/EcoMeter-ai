# Chrome Web Store — Listing Copy

> Paste this into the **Chrome Web Store Developer Dashboard → your item → Store listing → Description**.
> This is the long, feature-focused listing description (the manifest's `description` field is the short
> summary shown elsewhere and is separate). Keep this file in sync when you update the dashboard.

---

**EcoMeter AI — Resource Tracker**

Know what your AI habit actually costs. EcoMeter AI tracks token usage, cost, and water consumption in real time across Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, DeepSeek, Copilot, and Poe — right in a side panel next to your chat.

No signup. No servers. Everything runs locally in your browser.

**New: feed your real usage into the Subscription Auditor**
Turn on optional, opt-in usage tracking and EcoMeter quietly tallies your lifetime message counts and token volume per platform and model — no message content, ever. When you're ready, hit **Export for Auditor** to download a small local file, then drop it into Legerly's free Subscription Auditor (legerlyai.com/audit.html). It reads the file entirely in your browser and pre-fills the quiz with your *actual* usage instead of guesses — so the plan it recommends (or the "drop your subscription, pay pennies via API instead" verdict) is based on real numbers, not vibes.

Usage tracking is off by default. Turn it on only if you want the Auditor to use your real data.

**Optional: exact token counts instead of estimates**
By default every count is computed on your device, and EcoMeter tells you the error band it's working to (for example "±10% token estimate") rather than pretending to precision it doesn't have. If you want exact numbers, you can add your own Anthropic or Google AI API key and EcoMeter will count with that provider's own tokenizer instead.

This is **off by default and entirely optional**. Each key only affects its own platform, keys are held in session memory and cleared when your browser closes, and only the text of **your own messages** is sent to that provider's token-count endpoint — the same text you were already sending to that AI. Nothing else ever leaves your device. Add, change, or clear keys any time from the panel; you never have to start over.

**What it shows you**
- Live token counts, split input vs output, per message and per conversation
- True estimated cost — including the context replay and hidden system-prompt overhead most trackers ignore, not just the words you typed
- Water footprint, with a conservative (company-reported) and a full-lifecycle (academic) scope you can switch between
- Current per-model API pricing for the full Claude, GPT, Gemini, Grok, Mistral, Perplexity and DeepSeek line-ups, including Claude Opus 5

**Honest about what it can't see**
Costs are modelled estimates, not billing receipts, and EcoMeter says so in the panel. Caching discounts aren't modelled, so long conversations read high; plan caps and system-prompt overheads are approximations. We'd rather show you a number with its caveats than a confident one that's wrong.
