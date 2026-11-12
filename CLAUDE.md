# CLAUDE.md

This file is auto-loaded into every session. It states the mission and the rules that don't change. **Read [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) next** for architecture, data flow, and how to ship — it's the deep dive; this is the compass. **[`FRESHNESS.md`](FRESHNESS.md)** is the third: every number and claim here that goes stale, where its copies live, and what to check it against — reference it to re-verify the project in one pass.

## Mission

AI is a market failure built on **asymmetric information**. Providers know what their models cost — in dollars, in data, in water and energy — and structure things so the consumer doesn't. That gap is a lever for extracting value, and it's helping AI concentrate wealth rather than spread it.

**Legerly exists to close that gap so the consumer captures the benefit, not the provider.** We give AI users the information the providers don't surface: true cost, environmental footprint, and which plan actually fits their real usage. The test for any feature: *does this move value and knowledge back to the ordinary user?* If it doesn't, it's off-mission.

## What this repo is

One repo, two products (details in `PROJECT-CONTEXT.md`):
- **The Legerly website** (`legerlyai.com`) — static pages served by GitHub Pages from `main`.
- **EcoMeter AI** — a Manifest V3 Chrome extension in `extension/`, published to the Chrome Web Store.

Tied together by `prices.json` (single source of truth for pricing) and the measure→recommend loop: EcoMeter tracks real local usage → the Subscription Auditor recommends the plan that fits it.

**Direction (set 2026-10-25, done 2026-11-12): Legerly only provides the services.** The AI Clock and the AI Transparency Index are retired. `ai-clock.html` and `transparency-index.html` are now short notices pointing to the services, so old links still land somewhere, and the clock's data, scripts and quarterly workflow are deleted. The services are the **Subscription Auditor** (`audit.html`), the **Price Tracker with its break-even columns** (`pricing.html`) and **EcoMeter AI**. Effort goes there. One piece of the Index survives as Auditor data: its privacy answer reads the data-practices axis of `transparency-index.json` and links each point to the provider's page, so that file stays, stays checked (`check-transparency.js`, now cut down to exactly that), and its data-practices grades still get re-read (FRESHNESS E1f). See `PROJECT-CONTEXT.md` §7.

## Principles — strong; don't erode without asking

These are the point of the project. The user may change them, but a session should never quietly trade them away for convenience. If a task seems to require breaking one, stop and raise it.

- **Privacy-first / the user's data stays the user's.** Nothing is transmitted off-device except **optional, opt-in provider token-count calls** — Anthropic (Claude) and Google (Gemini) — each **off by default**, activated only when the user adds that provider's API key, sending only the user's own message text (the same content already going to that AI) to the provider's token-count endpoint. Usage tracking is opt-in, local-only, and deletable. Don't add telemetry, analytics, remote logging, or any third-party calls beyond those opt-in token-count endpoints. (Known wart: site pages load Google Fonts from Google — an open item to fix, not a precedent to extend.)
- **Full transparency, including about ourselves.** We grade what providers disclose, and "not disclosed" is a finding, not a gap to paper over. Hold the same standard internally: never present modeled, estimated, or approximate figures as if they were measured or certain. Label estimates as estimates. Cite sources. The AI Clock is a projection; plan caps are approximate — say so.
- **The consumer gets the full benefit.** When a design choice trades user benefit against anything else (ours, a provider's, simplicity), favor the user.

## Implementation — currently true, but open to change

These are how things work *today*, not sacred. Propose changes freely when they serve the mission; just don't assume they're fixed and don't assume they're up for grabs either — flag the change.

- No build step, no framework, no CDN — every page is a self-contained HTML file. (This keeps the site auditable and dependency-free; worth preserving, but not a principle.)
- Reactive extension versioning; `prices.json` split into `api` / `subscriptions` / `free_tiers`; plan metadata inline in `audit.html`.
- Specific stack/tooling choices are all negotiable — bring a better idea.

## Voice — for anything user-facing

Honest, plain, **zero bullshit**. No marketing gloss, no false certainty, no claiming to know more than we do. If we're unsure, say so. Prefer a concrete number with a caveat over a confident vague claim. Short words over long ones. The reader should trust us *because* we don't oversell — that trust is the product.

## Working notes

- **Solo project.** Rory builds this alone; there's no team audience to write around. Optimize for his continuity across sessions, not onboarding a crowd.
- **Anything time-sensitive goes in [`FRESHNESS.md`](FRESHNESS.md).** If a change adds a figure that will expire, a claim that needs re-verifying, or a seventh copy of existing data, add its entry there in the same commit — otherwise it rots unwatched.
- **Shipping:** website auto-deploys on merge to `main`; the extension is a manual/store flow. Full detail in `PROJECT-CONTEXT.md` §10.
- **PRs:** `gh` CLI is installed and authenticated — use it to open/merge PRs.
- When the mission, a principle, or a rule shifts in conversation, update **this file** (or `PROJECT-CONTEXT.md`) so it survives the session — don't let it live only in chat.
