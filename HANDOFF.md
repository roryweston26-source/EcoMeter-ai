# HANDOFF

Short status for the next session. Deep context lives in `PROJECT-CONTEXT.md` and `FRESHNESS.md`.

## 2026-11-26 — Anthropic and Google counts gated by site (branch `gate-anthropic-google-platform`, stacked on `openai-count-tokens`)

**What changed**
- `countTokens()` in `extension/sidepanel.js` now calls Anthropic only on the sites in `CLAUDE_KEY_PLATFORMS` (Claude, Poe, Copilot), and Google only on the sites in `GEMINI_KEY_PLATFORMS` (Gemini, Poe, Copilot). It still checks the model pick too. Before this, the model pick was the only check. A Claude pick left over on chatgpt.com, Grok, Perplexity or Gemini sent that site's text to Anthropic, and a Gemini pick did the same with Google. That broke the promise that we send only "the same text you're already sending to that AI".
- **Poe and Copilot qualify (Rory's call, 2026-11-26).** They host Claude and Gemini models, so the text does reach that provider. Two caveats are stated in the privacy policy: EcoMeter sees only its own picker, not the model the site actually used, and the text goes through Poe or Microsoft first. ChatGPT/OpenAI stays ChatGPT-only.
- The privacy policy, panel copy, store listing and submission text now name the sites for each key. "Each key affects only its own platform" was replaced, because it was never true before this change and isn't quite true now. The policy's effective date was already 2026-11-26.
- Checked by lifting `countTokens`, the two platform sets and the three API functions into a vm with a mocked `fetch`. All 18 cases pass (site × model × role, plus a no-keys case), and the test fails if any case throws. The script is in the side-session notes folder (`route-test-platform-gates.js`), not the repo.

**Open**
- Merge `openai-count-tokens` (#96) first. This branch is built on it.

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
- The Anthropic and Google paths had the same platform hole. Fixed on branch `gate-anthropic-google-platform` (see the entry above).
- The manifest version wasn't bumped (reactive versioning). The store upload is manual.
