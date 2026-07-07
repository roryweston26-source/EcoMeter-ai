// ── Storage schema version ────────────────────────────────
const STORAGE_VERSION = 1;

const versionFooterEl = document.getElementById('version-footer');
if (versionFooterEl) versionFooterEl.textContent = 'EcoMeter AI v' + chrome.runtime.getManifest().version + ' by Legerly';

// ── DOM refs ──────────────────────────────────────────────
const setupScreen   = document.getElementById('setup-screen');
const trackerScreen = document.getElementById('tracker-screen');
const apiKeyInput   = document.getElementById('api-key-input');
const saveBtn       = document.getElementById('save-btn');
const errorMsg      = document.getElementById('error-msg');
const statusDot     = document.getElementById('status-dot');
const platformBadge = document.getElementById('platform-badge');
const totalTokens   = document.getElementById('total-tokens');
const totalMsgs     = document.getElementById('total-msgs');
const ioRatio       = document.getElementById('io-ratio');
const totalCost     = document.getElementById('total-cost');
const modelLabel    = document.getElementById('model-label');
const modelMain     = document.getElementById('model-select-main');
const msgList       = document.getElementById('msg-list');
const totalWater      = document.getElementById('water-inline');
const waterScopeBtn   = document.getElementById('water-scope-btn');
const waterDisclaimer = document.getElementById('water-disclaimer');
const refreshBtn    = document.getElementById('refresh-btn');
const clearBtn      = document.getElementById('clear-btn');
const logoutBtn     = document.getElementById('logout-btn');
const latestBtn     = document.getElementById('latest-btn');
const footerStatus  = document.getElementById('footer-status');

// ── Pricing — loaded from prices.json ────────────────────
let FLAT_PRICES = {};
let FREE_TIERS  = {};   // { provider: { label, models:[{key,name,note}] } } — drives the model picker

function parsePrices(json) {
  const temp = {};
  for (const provider in json) {
    if (provider.startsWith('_')) continue;
    const group = json[provider];
    for (const modelId in group) {
      if (group[modelId]?.input !== undefined) temp[modelId] = group[modelId];
    }
  }
  // Sort longest key first so the substring fallback in getPrice()
  // matches "gpt-4o" before "gpt-4", "claude-sonnet-4-6" before "claude-sonnet", etc.
  const sorted = Object.keys(temp).sort((a, b) => b.length - a.length);
  FLAT_PRICES = {};
  for (const k of sorted) FLAT_PRICES[k] = temp[k];
}

// Minimal fallback so the picker/prices still work if prices.json can't load
// (it's bundled, so this is defensive only). Mirrors the free-tier shape.
const FALLBACK_API = {
  anthropic: {
    'claude-sonnet-4-6':         { input: 3.00/1e6, output: 15.00/1e6 },
    'claude-haiku-4-5-20251001': { input: 1.00/1e6, output:  5.00/1e6 },
  },
  openai: {
    'gpt-5.5':      { input: 5.00/1e6, output: 30.00/1e6 },
    'gpt-5.4-mini': { input: 0.75/1e6, output:  4.50/1e6 },
  },
  google: {
    'gemini-3.5-flash': { input: 0.50/1e6, output: 3.00/1e6 },
  },
};
const FALLBACK_FREE_TIERS = {
  anthropic: { label: 'Claude', models: [
    { key: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', note: 'default' },
    { key: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', note: 'limited' },
  ]},
  openai: { label: 'ChatGPT', models: [
    { key: 'gpt-5.5', name: 'GPT-5.5', note: 'default' },
    { key: 'gpt-5.4-mini', name: 'GPT-5.4 mini', note: 'Thinking' },
  ]},
  google: { label: 'Gemini', models: [
    { key: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', note: 'default' },
  ]},
};

async function loadPrices() {
  try {
    const res  = await fetch(chrome.runtime.getURL('prices.json'));
    const json = await res.json();
    parsePrices(json.api || json);
    FREE_TIERS = json.free_tiers || FALLBACK_FREE_TIERS;
  } catch(e) {
    console.warn('[TokenTracker] prices.json failed, using hardcoded fallback');
    parsePrices(FALLBACK_API);
    FREE_TIERS = FALLBACK_FREE_TIERS;
  }
  buildModelDropdown();
}

// Rebuild the model picker from FREE_TIERS so it only lists models a FREE
// user of each platform can actually reach (e.g. no Claude Opus).
function buildModelDropdown() {
  if (!modelMain) return;
  const prev = userSelectedModel || modelMain.value;
  modelMain.innerHTML = '';

  const ph = document.createElement('option');
  ph.value = '';
  ph.disabled = true;
  ph.selected = true;
  ph.textContent = '— pick a model for cost estimates —';
  modelMain.appendChild(ph);

  for (const prov in FREE_TIERS) {
    const grp = FREE_TIERS[prov];
    if (!grp || !Array.isArray(grp.models) || !grp.models.length) continue;
    const og = document.createElement('optgroup');
    og.label = grp.label || prov;
    grp.models.forEach(mo => {
      const opt = document.createElement('option');
      opt.value = mo.key;
      opt.textContent = mo.note ? `${mo.name} · ${mo.note}` : mo.name;
      og.appendChild(opt);
    });
    modelMain.appendChild(og);
  }

  // Re-select the user's stored model if it's still a listed (free) option.
  if (prev) modelMain.value = prev;
}

function getPrice(modelKey) {
  if (!modelKey) return null;
  // Exact match first (fast path — covers all well-formed dropdown values)
  if (FLAT_PRICES[modelKey]) return FLAT_PRICES[modelKey];
  // Substring fallback: keys are sorted longest-first, so "claude-sonnet-4-6"
  // is tested before "claude-sonnet". Only match in one direction (lookup key
  // contains the price-table key) to avoid "gpt-4" swallowing "gpt-4o" lookups.
  const k = modelKey.toLowerCase();
  for (const key of Object.keys(FLAT_PRICES)) {
    if (k.includes(key.toLowerCase())) return FLAT_PRICES[key];
  }
  return null;
}

// ── Water data ────────────────────────────────────────────
let WATER_DATA  = {};
let WATER_TIERS = {};
let waterScope  = 'conservative';

function parseWater(json) {
  WATER_TIERS = json._tiers || {};
  WATER_DATA  = {};
  for (const provider in json) {
    if (provider.startsWith('_')) continue;
    const group = json[provider];
    for (const modelId in group) {
      if (group[modelId]?.tier) WATER_DATA[modelId] = group[modelId].tier;
    }
  }
}

async function loadWater() {
  try {
    const res  = await fetch(chrome.runtime.getURL('water.json'));
    const json = await res.json();
    parseWater(json);
  } catch(e) {
    console.warn('[TokenTracker] water.json failed to load');
  }
}

function getWaterMlPerToken(modelKey) {
  if (!modelKey || !WATER_DATA[modelKey] || !WATER_TIERS[WATER_DATA[modelKey]]) return null;
  const tier = WATER_TIERS[WATER_DATA[modelKey]];
  return waterScope === 'academic'
    ? tier.academic_ml_per_token
    : tier.conservative_ml_per_token;
}

function fmtWater(ml) {
  if (ml >= 1000)  return (ml / 1000).toFixed(2) + ' L';
  if (ml >= 1)     return ml.toFixed(2) + ' ml';
  if (ml >= 0.001) return (ml * 1000).toFixed(2) + ' µl';
  return ml.toFixed(6) + ' ml';
}

// ── Tokenizer loading ─────────────────────────────────────
// tokenizer_cl100k.js (~1 MB) and tokenizer_o200k.js (~2.7 MB) are loaded
// lazily — only when a model is selected that actually needs tiktoken.
// Gemini, Perplexity, Copilot, and Poe all use char-ratio and never trigger
// this. Loading is deferred so the panel renders immediately on first open.
//
// MV3 CSP forbids eval/new Function, so we inject a <script> tag pointing to
// the bundled file via chrome.runtime.getURL. The IIFE inside each file sets
// the global (cl100k / o200k); we wait for the load event to confirm it.
let _cl100k           = null;
let _o200k            = null;
let _tokenizerReady   = false;
let _tokenizerPromise = null;

function _injectScript(filename) {
  return new Promise((resolve, reject) => {
    // Already loaded by a previous call — globals will be present.
    const existing = document.querySelector('script[data-tokenizer="' + filename + '"]');
    if (existing) { resolve(); return; }
    const el = document.createElement('script');
    el.src = chrome.runtime.getURL(filename);
    el.dataset.tokenizer = filename;
    el.onload  = () => resolve();
    el.onerror = () => reject(new Error('Failed to load ' + filename));
    document.head.appendChild(el);
  });
}

async function loadTokenizers() {
  if (_tokenizerReady) return true;
  if (_tokenizerPromise) return _tokenizerPromise;
  _tokenizerPromise = (async () => {
    try {
      await Promise.all([
        _injectScript('tokenizer_cl100k.js'),
        _injectScript('tokenizer_o200k.js'),
      ]);
      if (typeof cl100k !== 'undefined' && typeof o200k !== 'undefined') {
        _cl100k = cl100k.encode;
        _o200k  = o200k.encode;
        _tokenizerReady = true;
        return true;
      }
      console.warn('[TokenTracker] tokenizer globals not found after inject');
      return false;
    } catch(e) {
      console.warn('[TokenTracker] tokenizer load failed:', e.message);
      return false;
    }
  })();
  return _tokenizerPromise;
}

// Which tiktoken encoding to use for a given model key.
function getEncodingForModel(modelKey) {
  if (!modelKey) return 'char-ratio';
  const k = modelKey.toLowerCase();
  // o200k_base: GPT-4o family, GPT-4.1, all o-series (OpenAI confirmed)
  if (k.includes('gpt-4o') || k.includes('gpt-4.1') ||
      k === 'o1' || k === 'o1-mini' ||
      k === 'o3' || k === 'o3-mini' || k.startsWith('o4-')) return 'o200k_base';
  // cl100k_base: GPT-4/Turbo, Claude, Mistral, Codestral, DeepSeek, Grok
  // (Claude uses its own BPE trained separately; cl100k is ~97% accurate for English prose)
  if (k.includes('gpt-4') || k.includes('gpt-3') ||
      k.includes('claude') ||
      k.includes('mistral') || k.includes('codestral') ||
      k.includes('deepseek') || k.includes('grok')) return 'cl100k_base';
  // Gemini uses Gemma 3 SentencePiece (~4.2 chars/token for English)
  if (k.includes('gemini')) return 'sentencepiece';
  // Perplexity, Copilot, Poe — char-ratio
  return 'char-ratio';
}

function methodLabel(enc, modelKey) {
  if (enc === 'char-ratio') return 'estimated';
  if (enc === 'sentencepiece') return 'sp-estimated';
  const k = (modelKey || '').toLowerCase();
  const isOpenAI = k.includes('gpt') || k === 'o1' || k === 'o1-mini' ||
                   k === 'o3' || k === 'o3-mini' || k.startsWith('o4-');
  return isOpenAI ? 'tiktoken-exact' : 'tiktoken-approx';
}

function tiktokenCount(text, enc) {
  try {
    if (enc === 'o200k_base' && _o200k)   return _o200k(text).length;
    if (enc === 'cl100k_base' && _cl100k) return _cl100k(text).length;
  } catch(e) {}
  return null;
}

// ── Char-ratio fallback ───────────────────────────────────
// Segments text into code fences, URLs, and prose, applying different
// chars-per-token ratios to each. BPE tokenizers compress code more
// aggressively than prose, and URLs almost maximally.
//
//   Code fence content:  ~3.0 chars/token
//   URLs:                ~2.0 chars/token (very high density)
//   Code-heavy prose:    ~3.0 chars/token (detected by syntax symbols)
//   Normal prose:        ~4.0 chars/token
function charRatioEstimate(text) {
  if (!text) return 0;
  let tokens = 0;
  let remaining = text;

  // Segment out markdown code fences (```...```) — common in AI output
  const fenceRe = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;
  while ((match = fenceRe.exec(text)) !== null) {
    // Prose before this fence
    const before = text.slice(lastIndex, match.index);
    tokens += _estimateProse(before);
    // Code fence content: 3.0 chars/token
    tokens += Math.ceil(match[0].length / 3.0);
    lastIndex = match.index + match[0].length;
  }
  remaining = text.slice(lastIndex);

  // Within remaining text, pull out URLs (https?://...) — 2.0 chars/token
  const urlRe = /https?:\/\/\S+/g;
  let urlLastIndex = 0;
  while ((match = urlRe.exec(remaining)) !== null) {
    tokens += _estimateProse(remaining.slice(urlLastIndex, match.index));
    tokens += Math.ceil(match[0].length / 2.0);
    urlLastIndex = match.index + match[0].length;
  }
  tokens += _estimateProse(remaining.slice(urlLastIndex));

  return Math.max(1, tokens);
}

// Estimate prose/code-mixed text by detecting syntax density.
function _estimateProse(text) {
  if (!text) return 0;
  const chars = text.length;
  if (chars === 0) return 0;
  const syntaxCount =
    (text.match(/[{}[\];=<>()]/g) || []).length +
    (text.match(/\b(function|const|let|var|class|import|export|def|return|async|await|if|for|while)\b/g) || []).length * 3;
  const ratio = (syntaxCount > chars * 0.025) ? 3.0 : 4.0;
  return Math.ceil(chars / ratio);
}

// ── SentencePiece estimate for Gemini ────────────────────
// All Gemini models (2.0, 2.5 Flash, 2.5 Pro, etc.) use the Gemma 3
// SentencePiece tokenizer with a 262k-token vocabulary.
// English prose averages ~4.2 chars/token (vs BPE's ~4.0).
// Code is ~3.2 chars/token (SentencePiece handles code less aggressively than BPE).
// URLs remain ~2.0 chars/token.
function sentencePieceEstimate(text) {
  if (!text) return 0;
  let tokens = 0;
  let remaining = text;

  // Segment out code fences — SP is less aggressive on code than BPE
  const fenceRe = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;
  while ((match = fenceRe.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    tokens += _estimateSPProse(before);
    tokens += Math.ceil(match[0].length / 3.2);
    lastIndex = match.index + match[0].length;
  }
  remaining = text.slice(lastIndex);

  // Pull out URLs
  const urlRe = /https?:\/\/\S+/g;
  let urlLastIndex = 0;
  while ((match = urlRe.exec(remaining)) !== null) {
    tokens += _estimateSPProse(remaining.slice(urlLastIndex, match.index));
    tokens += Math.ceil(match[0].length / 2.0);
    urlLastIndex = match.index + match[0].length;
  }
  tokens += _estimateSPProse(remaining.slice(urlLastIndex));
  return Math.max(1, tokens);
}

function _estimateSPProse(text) {
  if (!text) return 0;
  const chars = text.length;
  if (chars === 0) return 0;
  const syntaxCount =
    (text.match(/[{}[\];=<>()]/g) || []).length +
    (text.match(/\b(function|const|let|var|class|import|export|def|return|async|await|if|for|while)\b/g) || []).length * 3;
  // SP vocab is larger so slightly more efficient on prose (4.2), less on code (3.2)
  const ratio = (syntaxCount > chars * 0.025) ? 3.2 : 4.2;
  return Math.ceil(chars / ratio);
}

// ── Unified token counter ─────────────────────────────────
// Priority: Anthropic token-counting API (Claude + API key, user messages only)
//         → tiktoken exact/approx (OpenAI & BPE-family models)
//         → char-ratio segmented estimate (Gemini, Perplexity, etc.)
async function countTokens(text, role, modelKey) {
  if (!text || text.trim().length === 0) return { count: 0, method: 'estimated' };

  // Anthropic token-counting API — exact for Claude, requires API key
  if (modelKey && modelKey.toLowerCase().includes('claude') && apiKey && role === 'user') {
    const api = await countTokensAnthropicAPI(text);
    if (api !== null) return { count: api, method: 'api-visible' };
  }

  const enc = getEncodingForModel(modelKey);

  if (enc !== 'char-ratio') {
    const ready = await loadTokenizers();
    if (ready) {
      const raw = tiktokenCount(text, enc);
      if (raw !== null) {
        // tiktoken counts literal scraped text. Assistant messages have markdown
        // stripped by the DOM, so apply a small correction to recover those tokens.
        const count = (role === 'assistant') ? Math.ceil(raw * 1.04) : raw;
        return { count, method: methodLabel(enc, modelKey) };
      }
    }
  }

  // SentencePiece estimate for Gemini (better accuracy than char-ratio)
  if (enc === 'sentencepiece') {
    const count = (role === 'assistant')
      ? Math.ceil(sentencePieceEstimate(text) * 1.04)
      : sentencePieceEstimate(text);
    return { count, method: 'sp-estimated' };
  }

  return {
    count: (enc !== 'char-ratio' && role === 'assistant')
      ? Math.ceil(charRatioEstimate(text) * 1.08)
      : charRatioEstimate(text),
    method: 'estimated',
  };
}

// ── Reasoning token multipliers ───────────────────────────
// o1/o3 and DeepSeek R1 use hidden chain-of-thought tokens billed at output rates.
// These are highly variable (1–10× depending on task complexity).
// Shown as a range in the UI; the midpoint is used for the cost estimate.
const REASONING_RANGES = {
  'o1':           { lo: 2, hi: 6,  mid: 3.5 },
  'o1-mini':      { lo: 1, hi: 4,  mid: 2.0 },
  'o3':           { lo: 3, hi: 8,  mid: 4.0 },
  'o3-mini':      { lo: 1, hi: 5,  mid: 2.5 },
  'o4-mini':      { lo: 1, hi: 4,  mid: 2.0 },
  'deepseek-r1':        { lo: 1, hi: 5,  mid: 2.5 },
  'deepseek-v4-flash':  { lo: 1, hi: 5,  mid: 2.5 },
  'deepseek-reasoner':  { lo: 1, hi: 5,  mid: 2.5 },
};

// ── Platform system-prompt overhead ──────────────────────
// Hidden system prompts, safety policies, tool schemas added to every API call.
// Perplexity overhead varies significantly: ~8k when web search is active,
// ~1.5k for direct answers. The value here represents the web-search case.
const PLATFORM_OVERHEAD_TOKENS = {
  'Claude':      3000,
  'ChatGPT':     2000,
  'Gemini':      3500,
  'Perplexity':  8000,  // Includes search result context when web search fires
  'Copilot':     4000,
  'Grok':        2000,
  'Mistral':     1500,
  'DeepSeek':    2000,
  'Poe':         2000,
};

// ── Image token estimation ────────────────────────────────
// Uses actual image dimensions when available (passed from content.js).
// Falls back to documented per-platform averages when dimensions are absent or zero.
//
// Claude:   tile formula — ceil(w/32) * ceil(h/32) * 65 tokens (empirically ~1600 for 1000×1000)
// GPT-4o:   85 base + ceil(w/512) * ceil(h/512) * 170 tiles
// Gemini:   fixed 258 tokens per image (Google-documented)
// Others:   1000 token fallback
function estimateImageTokens(img, platformName) {
  const w = img.width  || 0;
  const h = img.height || 0;

  if (w > 0 && h > 0) {
    if (platformName === 'Claude') {
      return Math.ceil(w / 32) * Math.ceil(h / 32) * 65;
    }
    if (platformName === 'ChatGPT') {
      // Images >2048 on either side are scaled down by the API
      const sw = Math.min(w, 2048);
      const sh = Math.min(h, 2048);
      return 85 + Math.ceil(sw / 512) * Math.ceil(sh / 512) * 170;
    }
    // Gemini is fixed regardless of dimensions
    if (platformName === 'Gemini') return 258;
  }

  // No dimensions — use documented averages
  const FALLBACK = { Claude: 1600, ChatGPT: 765, Gemini: 258 };
  return FALLBACK[platformName] || 1000;
}

// ── Context replay estimation ─────────────────────────────
// Real AI APIs resend the full conversation history with every message.
// Turn 1 costs msg1; Turn 2 costs msg1+msg2; Turn N costs msg1+…+msgN.
// Replay tokens are billed at the input rate only (not the avg of in+out).
function estimateConversationReplay(messages) {
  let running = 0, total = 0;
  for (const m of messages) {
    running += m.tokens || 0;
    total   += running;
  }
  return total;
}

// ── Anthropic token counting API ──────────────────────────
async function countTokensAnthropicAPI(text) {
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'token-counting-2024-11-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.input_tokens || null;
  } catch(e) { return null; }
}

// ── State ─────────────────────────────────────────────────
let apiKey             = null;
let msgData            = [];
let counting           = false;
let updateQueued       = false;
let latestPayload      = null;
let latestOnly         = false;
let currentPlatformName  = '—';
let currentPlatformColor = '#d4a843';
let currentImages        = [];   // array of {width, height} from content.js
let userSelectedModel    = null;
let _onSupportedTab      = false;  // flipped true when content script sends MESSAGES_UPDATED

function fmt(n) {
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'k';
  return String(n);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Render summary bar ────────────────────────────────────
function renderSummary() {
  const counted = msgData.filter(m => m.counted);
  const inp  = counted.filter(m => m.role === 'user').reduce((a,m) => a + (m.tokens||0), 0);
  const out  = counted.filter(m => m.role === 'assistant').reduce((a,m) => a + (m.tokens||0), 0);
  const tot  = inp + out;
  const key  = userSelectedModel;
  const p    = key ? getPrice(key) : null;
  const hasEstimates = msgData.some(m => m.method === 'estimated' || m.method === 'sp-estimated' || m.method === 'tiktoken-approx');

  totalTokens.textContent = hasEstimates ? '~' + fmt(tot) : fmt(tot);
  totalMsgs.textContent   = msgData.length + ' message' + (msgData.length !== 1 ? 's' : '');
  ioRatio.textContent     = fmt(inp) + ' in · ' + fmt(out) + ' out';

  if (p && tot > 0) {
    const range = REASONING_RANGES[key];
    const adjustedOut  = out * (range ? range.mid : 1.0);
    const adjustedCost = inp * p.input + adjustedOut * p.output;

    // Image cost — use actual dimensions if available
    const imgCost = currentImages.reduce((sum, img) => {
      const toks = estimateImageTokens(img, currentPlatformName);
      return sum + toks * p.input;
    }, 0);

    // Context replay: cumulative input resent each turn, billed at input rate
    const replayTokens = estimateConversationReplay(msgData.filter(m => m.counted));
    const replayCost   = replayTokens * p.input;

    const overhead     = PLATFORM_OVERHEAD_TOKENS[currentPlatformName] || 2000;
    const overheadCost = overhead * p.input;

    const trueCost    = adjustedCost + imgCost + replayCost + overheadCost;
    const visibleCost = adjustedCost + imgCost;

    totalCost.textContent = '~$' + trueCost.toFixed(3);

    // Model label: show reasoning range if applicable
    let labelText = key;
    if (range) labelText += ` · ×${range.lo}–${range.hi} reasoning (mid ×${range.mid})`;
    modelLabel.textContent = labelText;

    const imgNote  = currentImages.length > 0
      ? ' · ' + currentImages.length + ' img' + (currentImages.length > 1 ? 's' : '')
      : '';
    const perfNote = currentPlatformName === 'Perplexity'
      ? ' (overhead assumes web search active)'
      : '';
    const replayEl = document.getElementById('replay-cost-label');
    if (replayEl) {
      replayEl.textContent =
        '~$' + visibleCost.toFixed(4) + ' visible' + imgNote +
        ' — true cost includes replay + overhead' + perfNote;
    }
  } else {
    totalCost.textContent = '—';
    modelLabel.textContent = 'select model ↓';
    const replayEl = document.getElementById('replay-cost-label');
    if (replayEl) replayEl.textContent = '';
  }

  // Water
  const wml = getWaterMlPerToken(key);
  if (wml && tot > 0 && totalWater) {
    totalWater.textContent  = '💧 ~' + fmtWater(tot * wml);
    totalWater.style.display = 'inline';
    if (waterDisclaimer) waterDisclaimer.style.display = 'block';
  } else if (totalWater) {
    totalWater.style.display = 'none';
  }
}

// ── Render message cards ──────────────────────────────────
function renderMessages() {
  msgList.innerHTML = '';

  if (msgData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '💬';
    const title = document.createElement('div');
    title.className = 'empty-title';
    title.textContent = 'Waiting for conversation';
    const sub = document.createElement('div');
    sub.className = 'empty-sub';
    sub.textContent = 'Open any supported AI chat and messages will appear here with token counts.';
    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(sub);
    msgList.appendChild(empty);
    return;
  }

  let display = [...msgData].reverse();
  if (latestOnly) {
    const lastA = display.find(m => m.role === 'assistant');
    const lastU = display.find(m => m.role === 'user');
    display = [lastA, lastU].filter(Boolean);
  }

  const maxTok    = Math.max(...msgData.map(m => m.tokens || 0), 1);
  const key       = userSelectedModel;
  const platColor = currentPlatformColor;

  display.forEach(m => {
    const isUser      = m.role === 'user';
    const borderColor = isUser ? (platColor || '#d4a843') : '#5b9cf6';
    const pct         = m.counted ? Math.round(((m.tokens || 0) / maxTok) * 100) : 0;
    const preview     = (m.text || '').replace(/\s+/g, ' ').trim().slice(0, 130);
    const isEst       = m.method === 'estimated' || m.method === 'sp-estimated' || m.method === 'tiktoken-approx';
    const isApiVis    = m.method === 'api-visible';
    const tokSuffix   = isApiVis ? '*' : (m.method === 'tiktoken-approx' || m.method === 'sp-estimated' ? '≈' : '');
    const tokPrefix   = isEst ? '~' : '';
    const platLabel   = (currentPlatformName && currentPlatformName !== '—') ? currentPlatformName : 'AI';

    const card = document.createElement('div');
    card.className        = 'c-card';
    card.style.borderLeft = '3px solid ' + borderColor;

    const header = document.createElement('div');
    header.className = 'c-hdr';

    const roleSpan = document.createElement('span');
    roleSpan.className   = 'c-role ' + (isUser ? 'c-role-u' : 'c-role-a');
    roleSpan.textContent = isUser ? 'You' : platLabel;
    header.appendChild(roleSpan);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'c-meta';

    if (m.counted) {
      const tokSpan = document.createElement('span');
      tokSpan.className   = 'c-tok';
      tokSpan.textContent = tokPrefix + fmt(m.tokens) + tokSuffix + ' tok';
      metaDiv.appendChild(tokSpan);

      if (key) {
        const p = getPrice(key);
        if (p) {
          const c = m.tokens * (isUser ? p.input : p.output);
          const costSpan = document.createElement('span');
          costSpan.className   = 'c-cost';
          costSpan.textContent = '$' + c.toFixed(5);
          metaDiv.appendChild(costSpan);
        }
      }
    } else {
      const countingSpan = document.createElement('span');
      countingSpan.className   = 'c-counting';
      countingSpan.textContent = 'counting…';
      metaDiv.appendChild(countingSpan);
    }

    header.appendChild(metaDiv);
    card.appendChild(header);

    if (m.counted) {
      const barWrap = document.createElement('div');
      barWrap.className = 'c-bar';
      const barFill = document.createElement('div');
      barFill.className        = 'c-bar-fill';
      barFill.style.width      = pct + '%';
      barFill.style.background = 'linear-gradient(90deg,' + borderColor + ',#5b9cf6)';
      barWrap.appendChild(barFill);
      card.appendChild(barWrap);
    }

    const previewDiv = document.createElement('div');
    previewDiv.className   = 'c-preview';
    previewDiv.textContent = preview;
    card.appendChild(previewDiv);

    msgList.appendChild(card);
  });

  msgList.scrollTop = 0;
}

// ── Update platform badge ─────────────────────────────────
function updatePlatformBadge() {
  if (!platformBadge) return;
  platformBadge.textContent       = currentPlatformName;
  platformBadge.style.background  = currentPlatformColor + '22';
  platformBadge.style.color       = currentPlatformColor;
  platformBadge.style.borderColor = currentPlatformColor + '55';
}

function setStatus(s) {
  statusDot.className = 'status-dot ' + (s || '');
}

// ── Process messages from content script ──────────────────
async function processMessages(rawMsgs, platformName, platformColor, images) {
  if (!rawMsgs || rawMsgs.length === 0) return;

  if (counting) {
    latestPayload = { rawMsgs, platformName, platformColor, images };
    updateQueued  = true;
    return;
  }

  counting     = true;
  updateQueued = false;
  latestPayload = null;

  try {
    currentPlatformName  = platformName  || currentPlatformName;
    currentPlatformColor = platformColor || currentPlatformColor;
    currentImages        = images        || [];
    updatePlatformBadge();
    setStatus('live');
    footerStatus.textContent = 'Reading conversation…';

    // Hash-keyed merge — preserves counted results regardless of index shifts
    const cache = new Map(msgData.map(m => [m.role + ':' + m.text, m]));
    msgData = rawMsgs.map(raw => {
      const hit = cache.get(raw.role + ':' + raw.text);
      if (hit && hit.counted) return hit;
      return { role: raw.role, text: raw.text, tokens: null, cost: null, counted: false, method: null };
    });

    renderMessages();
    renderSummary();

    const activeModelKey = userSelectedModel;
    if (activeModelKey && getEncodingForModel(activeModelKey) !== 'char-ratio') {
      footerStatus.textContent = 'Loading tokenizer…';
      await loadTokenizers();
    }

    footerStatus.textContent = 'Counting tokens…';

    // Snapshot guard: if Refresh/Clear replaces msgData mid-await, we discard
    const snapshot = msgData;
    await Promise.all(
      snapshot.map(async (m, i) => {
        if (m.counted) return;
        try {
          const result        = await countTokens(m.text, m.role, activeModelKey);
          snapshot[i].tokens  = result.count;
          snapshot[i].counted = true;
          snapshot[i].method  = result.method;
        } catch(e) {
          const base    = charRatioEstimate(m.text);
          const fallEnc = getEncodingForModel(activeModelKey);
          snapshot[i].tokens  = (fallEnc !== 'char-ratio' && m.role === 'assistant')
            ? Math.ceil(base * 1.08) : base;
          snapshot[i].counted = true;
          snapshot[i].method  = 'estimated';
        }
      })
    );

    if (msgData !== snapshot) return;

    renderMessages();
    renderSummary();

    const methods = new Set(msgData.map(m => m.method).filter(Boolean));
    let methodSummary;
    if      (methods.has('api-visible'))                                                                    methodSummary = 'Exact (Anthropic API)';
    else if (methods.has('tiktoken-exact') && !methods.has('tiktoken-approx') && !methods.has('estimated')) methodSummary = 'Exact (tiktoken)';
    else if (methods.has('tiktoken-approx') && !methods.has('estimated'))                                   methodSummary = '~tiktoken (~97%)';
    else if (methods.has('tiktoken-approx'))                                                                methodSummary = '~tiktoken + estimated';
    else if (methods.has('sp-estimated') && !methods.has('estimated'))                                      methodSummary = '~SentencePiece (~85%)';
    else                                                                                                    methodSummary = '~estimated';
    footerStatus.textContent = methodSummary + ' · Updated ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  } catch(err) {
    console.error('[TokenTracker] processMessages error:', err);
    footerStatus.textContent = updateQueued
      ? 'Error counting tokens — retrying…'
      : 'Error counting tokens — open a message to retry';
  } finally {
    counting = false;
    if (updateQueued && latestPayload) {
      const p   = latestPayload;
      latestPayload = null;
      updateQueued  = false;
      processMessages(p.rawMsgs, p.platformName, p.platformColor, p.images);
    }
  }
}

// ── Listen for messages from content script ───────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'MESSAGES_UPDATED') {
    // Content script only fires this from supported AI sites, so we know
    // we're on a supported tab — no chrome.tabs.query needed.
    _onSupportedTab = true;
    setStatus('live');
    processMessages(msg.messages, msg.platformName, msg.platformColor, msg.images || []);
  }
  if (msg.type === 'CONVERSATION_CHANGED') {
    _onSupportedTab      = false;
    msgData              = [];
    currentImages        = [];
    latestPayload        = null;
    updateQueued         = false;
    currentPlatformName  = '—';
    currentPlatformColor = '#d4a843';
    renderMessages();
    renderSummary();
    updatePlatformBadge();
    footerStatus.textContent = 'New conversation — waiting for messages…';
  }
});

// ── Request messages from active tab ─────────────────────
// Routed via background.js so the sidepanel never needs the "tabs" permission.
// The background worker holds the activeTabId from the action.onClicked event
// and forwards the REQUEST_MESSAGES ping to the content script.
function requestMessages() {
  chrome.runtime.sendMessage({ type: 'REQUEST_MESSAGES_FROM_ACTIVE_TAB' },
    () => void chrome.runtime.lastError);
}

// ── Verify API key ────────────────────────────────────────
async function verifyKey(key) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'token-counting-2024-11-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: 'test' }],
      }),
    });
    return res.ok;
  } catch(e) { return false; }
}

// ── Show tracker ──────────────────────────────────────────
function showTracker() {
  chrome.storage.local.set({ setupDone: true });
  setupScreen.style.display   = 'none';
  trackerScreen.style.display = 'flex';
  setStatus('live');
  updatePlatformBadge();
  requestMessages();
  startPolling();
}

let pollingStarted  = false;
let pollingInterval = null;

function startPolling() {
  if (pollingStarted) return;
  pollingStarted = true;
  // Poll every 5s, but only when the tab is visible and on a supported site.
  // Pausing when hidden avoids pointless background roundtrips while the user
  // is in another tab or window.
  pollingInterval = setInterval(() => {
    if (_onSupportedTab && document.visibilityState === 'visible') requestMessages();
  }, 5000);
}

// ── Init ──────────────────────────────────────────────────
(async () => {
  await loadPrices();
  await loadWater();

  const stored        = await chrome.storage.local.get(['userModel', 'setupDone', 'storageVersion']);
  const storedSession = await chrome.storage.session.get(['apiKey']);

  if (!stored.storageVersion) {
    await chrome.storage.local.set({ storageVersion: STORAGE_VERSION });
  }

  if (storedSession.apiKey) apiKey = storedSession.apiKey;
  if (stored.userModel) {
    userSelectedModel = stored.userModel;
    if (modelMain) modelMain.value = stored.userModel;
  }

  if (stored.setupDone || storedSession.apiKey) {
    showTracker();
  } else {
    setupScreen.style.display   = 'flex';
    trackerScreen.style.display = 'none';
  }
})();

// ── Skip button ───────────────────────────────────────────
const skipBtn = document.getElementById('skip-btn');
if (skipBtn) skipBtn.addEventListener('click', () => showTracker());

// ── Model selection ───────────────────────────────────────
modelMain.addEventListener('change', async () => {
  userSelectedModel = modelMain.value || null;
  if (userSelectedModel) {
    await chrome.storage.local.set({ userModel: userSelectedModel });
  } else {
    await chrome.storage.local.remove('userModel');
  }
  renderMessages();
  renderSummary();
});

// ── Save API key ──────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  errorMsg.textContent = '';

  if (!key) {
    errorMsg.textContent = 'Please enter a key, or use the Skip button above.';
    return;
  }
  if (!key.startsWith('sk-ant-')) {
    errorMsg.textContent = 'Key should start with sk-ant-…';
    return;
  }

  saveBtn.textContent = 'Verifying…';
  saveBtn.disabled    = true;

  const ok = await verifyKey(key);
  saveBtn.textContent = 'Connect Key & Start';
  saveBtn.disabled    = false;

  if (!ok) {
    errorMsg.textContent = 'Key invalid — check it, or use Skip above for estimates.';
    return;
  }

  apiKey = key;
  await chrome.storage.session.set({ apiKey: key });
  showTracker();
});

// ── Controls ──────────────────────────────────────────────
refreshBtn.addEventListener('click', () => {
  msgData = msgData.map(m => ({ ...m, tokens: null, cost: null, counted: false, method: null }));
  renderMessages();
  renderSummary();
  requestMessages();
});

latestBtn.addEventListener('click', () => {
  latestOnly = !latestOnly;
  latestBtn.classList.toggle('active', latestOnly);
  latestBtn.textContent = latestOnly ? 'All' : 'Latest';
  renderMessages();
});

clearBtn.addEventListener('click', () => {
  msgData = [];
  renderMessages();
  renderSummary();
  footerStatus.textContent = 'Cleared';
});

logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['userModel', 'setupDone', 'storageVersion']);
  await chrome.storage.session.clear();
  apiKey            = null;
  userSelectedModel = null;
  msgData           = [];
  clearInterval(pollingInterval);
  pollingInterval = null;
  pollingStarted  = false;
  trackerScreen.style.display = 'none';
  setupScreen.style.display   = 'flex';
  apiKeyInput.value = '';
  setStatus('');
});

// ── Water scope toggle ────────────────────────────────────
waterScopeBtn.addEventListener('click', () => {
  waterScope = waterScope === 'conservative' ? 'academic' : 'conservative';
  waterScopeBtn.textContent = waterScope === 'academic' ? '💧 Full-scope' : '💧 Conservative';
  waterScopeBtn.classList.toggle('active', waterScope === 'academic');
  renderSummary();
});
