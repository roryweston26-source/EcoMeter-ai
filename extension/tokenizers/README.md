# Exact-local tokenizers (Phase 3)

This folder stages the **real provider tokenizers** so EcoMeter can count some models
with the provider's own tokenizer **locally** (no network), instead of the tiktoken
proxy or char-ratio estimate. It's a **drop-in**: the plumbing ships inert and only
turns on once an asset is staged *and* the encoder verifies itself.

## The safety model (why this is always safe to merge)

The exact-local path is **off unless a bundled encoder reproduces reference counts
exactly.** Concretely, `tokenizer_hf.js` loads its vocab + `reference.json`, encodes the
reference texts, and **registers only if every count matches**. A missing asset, missing
`reference.json`, a Rust→JS regex mismatch, or any encoder bug → it stays off and counting
falls back to the existing proxy/estimate. It can never present an unverified count as
"exact". (Wiring lives in `sidepanel.js`: `registerExactTokenizer` / `exactLocalCount`.)

## Drop-in flow

1. **Stage the assets**

   ```bash
   node scripts/fetch-tokenizers.js
   ```

   Downloads into this folder. Gemma and some Mistral repos are **license-gated** on
   Hugging Face and will 401 — accept the license there and download the tokenizer file
   manually to the filename the script prints. Provenance is recorded in `manifest.json`.

2. **Generate `reference.json`** with each provider's **official** tokenizer (Python), e.g.

   ```python
   from transformers import AutoTokenizer
   tok = AutoTokenizer.from_pretrained("deepseek-ai/DeepSeek-V3")
   samples = ["Hello, world!", "```py\nfor i in range(10): print(i)\n```", "…mixed prose + URLs…"]
   import json; json.dump(
     {"deepseek": [{"text": s, "tokens": len(tok.encode(s, add_special_tokens=False))} for s in samples]},
     open("extension/tokenizers/reference.json","w"), ensure_ascii=False, indent=1)
   ```

   Use a dozen-plus varied samples (prose, code, URLs, non-English). The more you include,
   the stronger the guarantee before the encoder trusts itself.

3. **Load the extension** — `tokenizer_hf.js` self-verifies on first count. Watch the
   console: `verified and enabled` (on) or `failed verification — staying on the proxy` /
   `no reference.json` (off). When on, DeepSeek counts show as **exact · local tokenizer**.

## Status per provider

| Provider | Encoder | Status |
|---|---|---|
| **DeepSeek** | `tokenizer_hf.js` (byte-level BPE from `tokenizer.json`) | ready — stage asset + reference, then it self-verifies |
| **Mistral (Tekken)** | reuse `tokenizer_hf.js` if you export Tekken as a HF `tokenizer.json`; otherwise a small tiktoken-vocab adapter | drop-in point; not wired to a default asset yet |
| **Gemini (Gemma)** | needs a SentencePiece runtime (wasm or a JS unigram decoder) — **not implemented**; add a module that calls `registerExactTokenizer('gemini', fn)` after verifying | documented registration point only |

## Build / packaging

The big vocab/model files are **git-ignored** (`.gitignore` here) to keep the repo lean;
only `README.md`, `reference.json`, and `manifest.json` are committed. Because the store
build zips `extension/`, the assets must be present **at build time** — so run
`node scripts/fetch-tokenizers.js` in the publish workflow before zipping (or commit the
assets if you prefer). Until then, exact-local stays off and nothing regresses.
