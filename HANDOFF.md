# HANDOFF

Short status for the next session. Deep context lives in `PROJECT-CONTEXT.md` and `FRESHNESS.md`.

## 2026-11-26 — opt-in OpenAI token counts for GPT-6 (branch `openai-count-tokens`)

**What changed**
- EcoMeter can now count GPT-6 messages exactly through OpenAI's `POST /v1/responses/input_tokens`, if the user adds an optional OpenAI key in the 🎯 Exact token counts panel.
- It's only called on ChatGPT and only for OpenAI models with no exact local tokenizer (today that's GPT-6.x). GPT-4o, 4.1 and 5 stay on bundled o200k, so their text is never sent.
- `api.openai.com` is an `optional_host_permissions` entry. Chrome asks for it on Save and Clear removes it.
- The privacy principle in CLAUDE.md now names three providers, with Rory's OK. The privacy policy (effective date now 2026-11-26), store listing and submission text, README, PROJECT-CONTEXT and FRESHNESS are updated to match.
- Footer fix: it no longer says "Exact" when only your own messages are exact and the replies are estimated.

**Open**
- **Not tested with a real OpenAI key.** The request shape is unit-checked against a mocked `fetch`, and the endpoint returns 401 without a key, but nothing shows OpenAI accepts the picker ids (`gpt-6-astra`, `gpt-6.1-sol` …). Before uploading to the store, load the extension unpacked, add a key, and count one GPT-6 message on chatgpt.com.
- The panel shows "✓ GPT-6 — exact" for any `sk-…` string; a bad key quietly falls back to the labelled estimate.
- OpenAI's docs don't say whether counting calls are billed. The UI and privacy policy say exactly that.
- The Anthropic and Google paths had the same platform hole: they gate on the model pick, not the site. A Claude pick left over on another site sends that site's text to Anthropic. That isn't fixed yet; it's a separate change.
- The manifest version wasn't bumped (reactive versioning). The store upload is manual.
