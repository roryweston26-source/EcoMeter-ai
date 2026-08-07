# Chrome Web Store — Listing Copy

> Paste the blocks below into **Developer Dashboard → your item → Store listing**.
> Permission justifications and privacy disclosures live in `STORE-SUBMISSION.md`.
> Keep this file in sync when you update the dashboard.
>
> Version this was written for: **6.12**

---

## ⚠️ Rejected 2026-07-29 — read before editing this file

v6.12 was rejected under **"Spam and Placement in the Store"** (ref: *Yellow Argon*) for *"excessive keywords in the item's description"*, quoting exactly:

> Claude, ChatGPT, Gemini, Grok, Mistral, Perplexity, DeepSeek, Copilot, and Poe

The nine-name list ran in the **opening sentence**, a **shortened version repeated in a bullet**, and **three more names in the short description** — which is also `manifest.json`'s `description`, so the same brands hit the reviewer across several fields at once. That repetition is what reads as stuffing, not the fact of naming platforms.

**Rule for this file from now on:**

- **Short description and `manifest.json`: no product names at all.**
- **Detailed description: name at most the big three (Claude, ChatGPT, Gemini), once, in prose, after the feature list — never in the hook, never repeated.**
- **The full supported-platform list belongs in a SCREENSHOT, not in the text.** That is the fix for the real tension here: users genuinely need to know whether their tool is covered, and an image conveys it without a keyword list for a reviewer to count. When a platform is added, update the screenshot — do not extend the sentence into a list.

⚠️ **This means the listing now depends on a screenshot that actually shows the supported platforms.** If that image isn't uploaded, the description points at something that doesn't exist, which is its own metadata problem. Check it before resubmitting.

---

## Short description

> Field: *"Short description"* — max 132 characters. This is also the `description` field in `manifest.json`; keep the two identical. **No brand names here** — see the rejection note above.

```
See what your AI chats really cost — tokens, money and water — computed on your device. By Legerly.
```

*(98 characters)*

---

## Detailed description

> Field: *"Description"*. Paste everything between the rules, verbatim.
>
> **This block is deliberately plain text — no markdown.** The Chrome Web Store does not render it, so `**bold**` would show up as literal asterisks. Section headings are just short lines with blank lines around them, and the bullets use a literal `•`. Don't "tidy" this into markdown.

---

Know what your AI habit actually costs.

EcoMeter AI tracks token usage, cost, and water consumption in real time, in a side panel right next to your chat.

No signup. No account. No servers of ours, ever. Everything is computed locally in your browser.

The cost you're actually paying, not the one that's easy to show

Most token counters add up the words you typed. That isn't what you're billed for. Every turn you send re-transmits the entire conversation so far, plus a hidden system prompt you never see — so real usage grows far faster than your visible text does.

EcoMeter models all of it: your messages, the AI's replies, context replay across the whole conversation, per-platform system-prompt overhead, image tokens, and reasoning-token multipliers for models that think before answering. It shows the visible cost and the true estimated cost side by side, so you can see the gap for yourself.

Water, with the methodology in the open

Switch between a conservative scope (on-site cooling water, as companies report it) and a full-lifecycle scope (including water consumed generating the electricity, per UC Riverside research). They differ by roughly 40×. We show you both and cite the sources rather than picking whichever number tells a better story.

Feed your real usage into the Subscription Auditor

Turn on optional usage tracking and EcoMeter keeps a running tally of your message counts and token volume per platform and model — on your device, never uploaded, counts only, no message content. Hit Export for Auditor to download a small local file and drop it into Legerly's free Subscription Auditor at legerlyai.com/audit.html. It reads the file entirely in your browser and pre-fills the quiz with your actual usage, so the plan it recommends — or its "cancel your subscription and pay pennies via API instead" verdict — comes from real numbers rather than guesses.

Usage tracking is off by default.

Optional: exact counts instead of estimates

By default every count runs on your device, and EcoMeter tells you the error band it's working to — "±10% token estimate" — rather than claiming a precision it doesn't have. If you want exact figures, add your own Anthropic or Google AI API key and it will count using that provider's own tokenizer.

Entirely optional and off by default. Each key affects only its own platform. Keys are held in session memory and cleared when your browser closes. Only the text of your own messages is sent to that provider's token-count endpoint — the same text you were already sending to that AI. AI responses are always counted locally and never transmitted. Add, change, or clear keys any time from the panel.

What you get

• Live token counts, split input vs output, per message and per conversation
• True estimated cost including replay and hidden overhead — not just your visible words
• Water footprint with switchable conservative and full-lifecycle scopes
• Up-to-date per-model API pricing, refreshed weekly, covering current frontier models as they ship
• A one-click usage export that makes the Subscription Auditor's recommendation real

It runs in the side panel on the major AI chat services — Claude, ChatGPT and Gemini among them. The screenshots below show the full list of supported platforms. The panel always names the site and the model it has detected, so you can see exactly what it is measuring.

Honest about what it can't see

These are estimates, not billing receipts, and the panel says so. Prompt caching isn't modelled — cached input bills far cheaper, so long conversations read high, and the gap widens the longer a chat runs. We don't model it because no provider publishes per-conversation cache-hit rates, and a guessed number would look precise without being true. System-prompt overheads and plan caps are approximations. Where we're estimating, we label it and show the error band.

That's the whole point. AI is sold on asymmetric information: providers know what your usage costs them and structure things so you don't. EcoMeter exists to close that gap — which only works if we're straight with you about the limits of what we can measure.

Free, open about its methodology, and built by Legerly.

---

## Category & fields

- **Category:** Productivity
- **Language:** English
- **Privacy policy URL:** `https://legerlyai.com/extension/privacy-policy.html`

## Pre-upload checklist

- [ ] `manifest.json` version bumped and matching `prices.json._meta.version`
- [ ] Short description above matches `manifest.json` `description`
- [ ] **No product names in the short description / manifest**, and at most the big three named **once** in the detailed description (this is what got v6.12 rejected — see the note at the top)
- [ ] **A screenshot showing the full supported-platform list is uploaded** — the description points at it, so it has to be there
- [ ] Hosted privacy policy redeployed **in the same release** as the extension
- [ ] Permission justifications pasted from `STORE-SUBMISSION.md`
- [ ] Data-usage disclosure reviewed (see the judgment call in `STORE-SUBMISSION.md` §3)
- [ ] Smoke-tested via load-unpacked at the version being uploaded
- [ ] `node scripts/test-cost-model.js` and `node scripts/check-prices.js` both pass
