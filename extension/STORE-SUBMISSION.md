# Chrome Web Store — Privacy Practices & Permission Justifications

> Paste each block into **Developer Dashboard → your item → Privacy practices**.
> Every field the dashboard asks for is below, in the order it appears.
> Keep this file in sync whenever `manifest.json` permissions change.
>
> Version this was written for: **6.12**

---

## 1. Single purpose

> Field: *"Single purpose description"*

```
EcoMeter AI shows the user the token usage, estimated cost, and estimated water footprint of their own AI chat conversations, in a side panel next to the chat they are already having. Everything is computed on the user's own device from the text visible on the page. That is the extension's only function.
```

---

## 2. Permission justifications

### `storage`

```
Stores the user's own settings on their device: which model they have selected, whether first-run setup is complete, and — only if they explicitly opt in — a local tally of their own usage (message counts and token totals per platform and model, never message content). Optional API keys the user chooses to enter are held in chrome.storage.session, which is memory-only and cleared when the browser closes. Nothing is synced to any remote server.
```

### `sidePanel`

```
The extension's entire user interface is a side panel. It displays the token counts, cost estimate, and water estimate for the conversation in the active tab, so the user can see the numbers alongside the chat rather than in a separate window.
```

### `activeTab`

```
Used to identify which supported AI site is currently in view, so the panel reads and reports figures for the conversation the user is actually looking at. Only the active tab's numeric ID is held, in memory, for the lifetime of the panel. No browsing history is read and no other tab is accessed.
```

### `scripting`

```
Required to inject the content script into x.com tabs only when the user navigates to the Grok chat path (x.com/grok or x.com/i/grok). Injection is path-gated, so the script never runs on any other x.com page. This exists specifically to AVOID declaring a broad x.com/* host permission across the whole domain, which would grant far more access than the extension needs.
```

### Host permissions

```
Two categories, for two distinct purposes.

(1) The AI chat sites — claude.ai, chatgpt.com, chat.openai.com, gemini.google.com, grok.com, chat.mistral.ai, perplexity.ai, www.perplexity.ai, copilot.microsoft.com, poe.com, chat.deepseek.com. Required to inject the content script that reads the visible conversation text so tokens can be counted locally. Access is limited to these specific chat domains. The text is counted and discarded; it is not stored and not transmitted.

(2) Two optional token-counting endpoints, each off by default and each used only if the user chooses to enter that provider's own API key:

- api.anthropic.com — used solely to call Anthropic's official /v1/messages/count_tokens endpoint so Claude counts are exact rather than estimated.
- generativelanguage.googleapis.com — used solely to call Google's official countTokens endpoint so Gemini counts are exact rather than estimated.

In both cases only the text of the user's OWN messages is sent, using the user's own key — never AI responses, and never any other data. If no key is entered, neither host is ever contacted and the extension makes zero network requests. Each key affects only its own platform.
```

### Remote code

> Field: *"Are you using remote code?"* → **No, I am not using remote code**

```
All code is bundled in the extension package. No script, module, or eval'd string is fetched at runtime. The tokenizer libraries, pricing data, water data, and fonts are all included in the package.
```

---

## 3. Data usage disclosures

> Field: *"What user data do you plan to collect?"*

**Recommended answer: tick "Website content" only.** Leave every other category unticked.

Reasoning, so you can confirm it yourself rather than take it on trust: Chrome counts data as *collected* when it leaves the user's device. In the default configuration nothing leaves the device and no box would be needed. But if the user opts in by entering an API key, the text of their own chat messages is transmitted to Anthropic's or Google's token-count endpoint. That is user-authored text from a web page, which falls under **Website content**.

Do **not** tick the following, none of which apply: personally identifiable information, health information, financial and payment information, authentication information, personal communications, location, web history, user activity.

> ⚠️ One judgment call worth making deliberately: an argument exists that chat messages are **"Personal communications"** rather than **"Website content"**. Chrome's own definition of personal communications centres on emails, texts, and chat messages between people, whereas this is a person's prompt to a machine — which is why "Website content" is the better fit. Under-declaring is a common cause of removal, so if you would rather be conservative, tick both. It costs nothing in review and cannot be held against you.

### Certifications

All three certification checkboxes can be ticked truthfully:

- ✅ I do not sell or transfer user data to third parties, outside of the approved use cases
- ✅ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ✅ I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## 4. Privacy policy URL

```
https://legerlyai.com/extension/privacy-policy.html
```

The full policy lives at `extension/privacy-policy.html` in this repo and deploys with the site. **Update the hosted page in the same release as the extension** — the store checks that the URL resolves and that the policy matches the permissions actually requested.
