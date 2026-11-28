# HANDOFF

Short status for the next session. Deep context lives in `PROJECT-CONTEXT.md` and `FRESHNESS.md`.

## Now (2026-11-26, late)
- **#96 and #97 are merged to `main`.** The branch notes below are history.
- **v6.20 is built** (`ecometer-ai-v6.20.zip` in the repo root, gitignored) and **not uploaded**. It supersedes 6.19, which was never uploaded. The version bump is on branch `ecometer-v6.20` (PR open). Details are in FRESHNESS H4.
- Before uploading: load the zip unpacked and try one message each on Claude, Gemini and ChatGPT (GPT-6) with real keys. Consider waiting until 2026-12-01 (the Gemini 2.5 sunset).
- Still open: Rory's call on Poe/Copilot (below).

## 2026-11-26 — Anthropic and Google counts gated to their own site (branch `gate-anthropic-google-platform`, stacked on `openai-count-tokens`)

**What changed**
- `countTokens()` in `extension/sidepanel.js` now calls Anthropic only when `currentPlatformName === 'Claude'` and Google only when it's `'Gemini'`, as well as checking the model pick. Before this, the check was the model pick alone. A Claude pick left over on chatgpt.com, Poe, Copilot or Gemini sent that site's text to Anthropic, and a Gemini pick did the same with Google. That broke the promise that we send only "the same text you're already sending to that AI".
- **Poe and Copilot are strict for now: they never qualify,** even with a Claude or Gemini model picked. Those messages fall back to the labelled local estimate. This is the conservative default, pending Rory's call (see Open).
- The privacy policy now names the site for each key (claude.ai, gemini.google.com, ChatGPT) and says Claude/Gemini models reached through Poe or Copilot are counted locally. The effective date was already 2026-11-26. The panel, store listing and submission text already said "each key affects only its own platform", so the code now matches them. They needed no edit.
- Checked by lifting `countTokens` and the three API functions into a vm with a mocked `fetch`: 15 cases (platform × model × role, plus a no-keys case) all pass. The same test on the pre-fix code shows 9 leaks. The script is in the side-session notes folder (`route-test-platform-gates.js`), not the repo.

**Open**
- **Rory to decide: Poe and Copilot.** Should a Claude/Gemini pick on Poe or Copilot use the user's key? The case for yes: the text does go to Anthropic or Google in the end. The case for no: the extension can't see which model Poe or Copilot actually used, only the picker, which can be stale. The text is also sent to Poe or Microsoft first, so "the AI you're sending it to" is the middleman. Loosening it is a one-line change to each gate, plus the policy sentence.
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
