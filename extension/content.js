// ============================================================
//  EcoMeter AI — Content Script v5.0
//  Brand detection only — user selects model in the panel.
// ============================================================

// ── Double-injection guard ────────────────────────────────
// executeScript (used for x.com/grok programmatic injection) can fire more
// than once if the user navigates back and forth on Grok. Exit immediately
// if this content script instance is already running in this window.
// The existing instance's navObserver will detect the URL change itself.
if (window.__aiTrackerLoaded) {
  // Nothing to do — the running instance already has observers in place.
} else {
  window.__aiTrackerLoaded = true;
  runContentScript();
}

function runContentScript() {

const PLATFORMS = {
  'claude.ai': {
    name: 'Claude',
    color: '#d4a843',
    messageSelectors: {
      user:      ['[data-testid="user-message"]'],
      assistant: ['.prose'],
    },
    specialScraper: 'claudeAI',
  },

  'chatgpt.com': {
    name: 'ChatGPT',
    color: '#10a37f',
    messageSelectors: {
      user:      ['[data-message-author-role="user"]'],
      assistant: ['[data-message-author-role="assistant"]'],
    },
    pairedAttr: 'data-message-author-role',
  },

  'chat.openai.com': {
    name: 'ChatGPT',
    color: '#10a37f',
    messageSelectors: {
      user:      ['[data-message-author-role="user"]'],
      assistant: ['[data-message-author-role="assistant"]'],
    },
    pairedAttr: 'data-message-author-role',
  },

  'gemini.google.com': {
    name: 'Gemini',
    color: '#4285f4',
    messageSelectors: {
      user:      ['user-query', '.user-query-content'],
      assistant: ['model-response', '.model-response-content'],
    },
  },

  'grok.com': {
    name: 'Grok',
    color: '#1d9bf0',
    messageSelectors: {
      user:      ['[class*="human-turn"]', '[data-role="user"]'],
      assistant: ['[class*="ai-turn"]',    '[data-role="assistant"]'],
    },
  },

  'x.com': {
    name: 'Grok',
    color: '#1d9bf0',
    messageSelectors: {
      user:      ['[data-role="user"]',      '[class*="UserMessage"]'],
      assistant: ['[data-role="assistant"]', '[class*="AssistantMessage"]'],
    },
  },

  'chat.mistral.ai': {
    name: 'Mistral',
    color: '#ff7000',
    messageSelectors: {
      user:      ['[class*="UserMessage"]', '[data-role="user"]'],
      assistant: ['[class*="AssistantMessage"]', '[data-role="assistant"]'],
    },
  },

  'www.perplexity.ai': {
    name: 'Perplexity',
    color: '#20b2aa',
    messageSelectors: {
      user:      ['[class*="UserMessage"]', '.font-sans.font-medium'],
      assistant: ['[class*="AnswerBody"]',  '[class*="prose"]'],
    },
  },

  'perplexity.ai': {
    name: 'Perplexity',
    color: '#20b2aa',
    messageSelectors: {
      user:      ['[class*="UserMessage"]', '.font-sans.font-medium'],
      assistant: ['[class*="AnswerBody"]',  '[class*="prose"]'],
    },
  },

  'copilot.microsoft.com': {
    name: 'Copilot',
    color: '#0078d4',
    messageSelectors: {
      user:      ['[class*="user-message"]',  'cib-chat-turn[is-user]'],
      assistant: ['[class*="bot-message"]',   'cib-chat-turn:not([is-user])'],
    },
  },

  'poe.com': {
    name: 'Poe',
    color: '#7c3aed',
    messageSelectors: {
      user:      ['[class*="humanMessageBubble"]'],
      assistant: ['[class*="botMessageBubble"]'],
    },
  },

  'chat.deepseek.com': {
    name: 'DeepSeek',
    color: '#6066ff',
    messageSelectors: {
      user:      ['[class*="user-message"]',      '.message-content--user'],
      assistant: ['[class*="assistant-message"]', '.message-content--assistant', '[class*="ds-markdown"]'],
    },
  },
};

// ── Detect platform ───────────────────────────────────────
function detectPlatform() {
  const host = location.hostname;
  return PLATFORMS[host] || PLATFORMS['www.' + host] || null;
}

// ── Robust text extractor ─────────────────────────────────
function extractText(el) {
  const inner = (el.innerText || '').trim();
  if (inner.length > 0) return inner;
  const content = (el.textContent || '').trim();
  if (content.length > 0) return content;
  const parts = [];
  el.querySelectorAll('p, li, td, h1, h2, h3, h4, span, code, pre').forEach(child => {
    const t = (child.innerText || child.textContent || '').trim();
    if (t) parts.push(t);
  });
  return parts.join(' ').trim();
}

// ── Visibility check ──────────────────────────────────────
function isVisible(el) {
  try {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  } catch(e) { return true; }
}

// ── Deduplicated element collector ───────────────────────
function getCleanEls(selectors) {
  let best = [];
  for (const sel of selectors) {
    try {
      let found = [];
      document.querySelectorAll(sel).forEach(el => {
        if (!isVisible(el)) return;
        const text = extractText(el);
        if (!text) return;
        const dominated = found.some(f => f.el.contains(el));
        if (dominated) return;
        found = found.filter(f => !el.contains(f.el));
        found.push({ el, text });
      });
      if (found.length > best.length) best = found;
    } catch(e) {}
  }
  return best;
}

// ── Claude.ai specific scraper ────────────────────────────
function scrapeClaudeAI() {
  const results = [];

  const userEls = Array.from(document.querySelectorAll('[data-testid="user-message"]'));
  userEls.forEach(el => {
    const text = extractText(el);
    if (text) results.push({ el, role: 'user', text });
  });
  const userElSet = new Set(userEls);

  const paras = Array.from(document.querySelectorAll('p.font-claude-response-body'));

  if (paras.length > 0) {
    const MAX_WALK_DEPTH = 8;
    function ancestorAt(el, depth) {
      let node = el;
      for (let i = 0; i < depth; i++) {
        if (!node.parentElement || node.parentElement === document.body) return node;
        node = node.parentElement;
      }
      return node;
    }
    let bestDepth = MAX_WALK_DEPTH;
    for (let d = 1; d <= MAX_WALK_DEPTH; d++) {
      const ancestors = new Set(paras.map(p => ancestorAt(p, d)));
      if (ancestors.size > 1) { bestDepth = d; break; }
    }
    const groupMap = new Map();
    paras.forEach(p => {
      const anc = ancestorAt(p, bestDepth);
      if (!groupMap.has(anc)) groupMap.set(anc, []);
      groupMap.get(anc).push(p);
    });
    groupMap.forEach((ps, container) => {
      const text = ps.map(p => extractText(p)).filter(Boolean).join('\n').trim();
      if (text && text.length > 2) results.push({ el: container, role: 'assistant', text });
    });
  } else {
    // Fallback: .prose nodes not inside user messages
    let deduped = [];
    Array.from(document.querySelectorAll('.prose')).filter(el => {
      if (!isVisible(el)) return false;
      for (const u of userElSet) { if (u.contains(el)) return false; }
      return true;
    }).forEach(el => {
      if (deduped.some(d => d.contains(el))) return;
      deduped = deduped.filter(d => !el.contains(d));
      deduped.push(el);
    });
    deduped.forEach(el => {
      const text = extractText(el);
      if (text && text.length > 2) results.push({ el, role: 'assistant', text });
    });
  }

  results.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
  const final = results.map(r => ({ role: r.role, text: r.text }));

  // ── Selector health check ───────────────────────────────
  // If we found user messages but zero assistant messages, Claude.ai's DOM
  // structure has likely changed (Tailwind class rename, layout restructure).
  // Log a warning so regressions are caught in testing rather than from
  // user reports. Uses [data-testid="user-message"] as the independent signal
  // because that attribute is semantic, not a generated Tailwind class.
  const hasUserMsgs      = userEls.length > 0;
  const hasAssistantMsgs = final.some(m => m.role === 'assistant');
  if (hasUserMsgs && !hasAssistantMsgs) {
    console.warn(
      '[TokenTracker] Claude.ai scraper: found', userEls.length,
      'user message(s) but 0 assistant messages.',
      '\nPrimary selector (p.font-claude-response-body):', paras.length, 'hits.',
      '\nThis likely means Claude.ai changed a CSS class name.',
      '\nPlease report at github.com/roryweston26-source/github.com-roryweston26-ai-token-tracker/issues with the current date.'
    );
  }

  return final;
}

// ── Scrape messages ───────────────────────────────────────
function scrapeMessages(platform) {
  const results = [];

  if (platform.specialScraper === 'claudeAI') {
    const msgs = scrapeClaudeAI();
    if (msgs.length > 0) return msgs;
  }

  if (platform.pairedAttr) {
    const allMsgs = document.querySelectorAll('[' + platform.pairedAttr + ']');
    allMsgs.forEach(el => {
      const role = el.getAttribute(platform.pairedAttr);
      if (role !== 'user' && role !== 'assistant') return;
      const text = extractText(el);
      if (text.length > 0) results.push({ role, text });
    });
    if (results.length > 0) return results;
  }

  const userEls      = getCleanEls(platform.messageSelectors.user      || []);
  const assistantEls = getCleanEls(platform.messageSelectors.assistant || []);

  const all = [
    ...userEls.map(m      => ({ ...m, role: 'user' })),
    ...assistantEls.map(m => ({ ...m, role: 'assistant' })),
  ].sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );

  all.forEach(m => results.push({ role: m.role, text: m.text }));
  if (results.length > 0) return results;

  // No structured messages found — return empty rather than guessing roles.
  // A mechanical user/assistant alternation over arbitrary DOM nodes produces
  // confidently wrong token counts, which is worse than showing nothing.
  // If this platform's selectors stop matching, the health-check warning in
  // scrapeClaudeAI (or a future equivalent) will surface the regression.
  return results;
}

// ── Image detection ───────────────────────────────────────
function detectImages(platform) {
  const images = [];
  const userContainers = document.querySelectorAll(
    '[data-testid="user-message"], [data-message-author-role="user"], user-query, [class*="human-turn"], [class*="user-message"]'
  );
  userContainers.forEach(container => {
    container.querySelectorAll('img').forEach(img => {
      // Skip decorative / UI-chrome images via ARIA semantics first —
      // more reliable than src/alt heuristics alone.
      if (img.getAttribute('aria-hidden') === 'true') return;
      if (img.getAttribute('role') === 'presentation') return;
      const src = img.src || '';
      const alt = (img.alt || '').toLowerCase();
      if (img.width < 40 || img.height < 40) return;
      if (src.includes('avatar') || src.includes('icon') || src.includes('logo')) return;
      if (alt.includes('avatar') || alt.includes('logo')) return;
      images.push({
        src: src.slice(0, 60),
        width:  img.naturalWidth  || img.width,
        height: img.naturalHeight || img.height,
      });
    });
  });
  return images;
}

// ── State ─────────────────────────────────────────────────
let lastSignature = '';
let observer      = null;
let platform      = null;
let debounceTimer = null;
let navObserver   = null;

// ── Message signature (djb2) ──────────────────────────────
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h >>>= 0;
  }
  return h.toString(36);
}

function buildSignature(msgs) {
  return msgs.map(m => m.role[0] + ':' + djb2(m.text)).join('|');
}

function checkAndReport() {
  if (!platform) return;
  if (!isActiveXcomPage()) return;
  const msgs   = scrapeMessages(platform);
  const images = detectImages(platform);
  if (msgs.length === 0) return;
  const sig = buildSignature(msgs) + '|img:' + images.length;
  if (sig === lastSignature) return;
  lastSignature = sig;

  chrome.runtime.sendMessage({
    type:          'MESSAGES_UPDATED',
    messages:      msgs,
    platformName:  platform.name,
    platformColor: platform.color,
    images,
  }, () => void chrome.runtime.lastError);
}

// ── Find best MutationObserver target ─────────────────────
function findMessageContainer() {
  const host = location.hostname;
  const specific = {
    'claude.ai':            ['[data-testid="conversation-turn-list"]', 'main'],
    'chatgpt.com':          ['[class*="conversation-turns"]', '[class*="react-scroll-to-bottom"]', 'main'],
    'chat.openai.com':      ['[class*="conversation-turns"]', 'main'],
    'gemini.google.com':    ['chat-window', 'conversation-container', 'main'],
    'grok.com':             ['[class*="conversation"]', 'main'],
    'x.com':                ['[class*="conversation"]', 'main'],
    'chat.mistral.ai':      ['[class*="conversation"]', 'main'],
    'www.perplexity.ai':    ['[class*="thread"]', 'main'],
    'perplexity.ai':        ['[class*="thread"]', 'main'],
    'copilot.microsoft.com':['cib-conversation-main', 'main'],
    'poe.com':              ['[class*="chatHistory"]', '[class*="messageList"]', 'main'],
    'chat.deepseek.com':    ['[class*="chat-content"]', '[class*="messageList"]', 'main'],
  };
  const candidates = [
    ...(specific[host] || []),
    '[class*="chat-messages"]', '[class*="message-list"]', '[class*="messages-container"]', 'main',
  ];
  for (const sel of candidates) {
    try {
      const el = document.querySelector(sel);
      if (el && el.childElementCount >= 1) return el;
    } catch(e) {}
  }
  return document.body;
}

// ── x.com path guard ─────────────────────────────────────
function isActiveXcomPage() {
  if (location.hostname !== 'x.com') return true;
  return location.pathname.startsWith('/i/grok') || location.pathname.startsWith('/grok');
}

// ── Boot ──────────────────────────────────────────────────
platform = detectPlatform();

if (platform) {
  const start = () => {
    if (observer) observer.disconnect();
    let observedTarget = document.body;
    const handleMutation = () => {
      const best = findMessageContainer();
      if (best !== observedTarget) {
        observedTarget = best;
        observer.disconnect();
        observer.observe(observedTarget, { childList: true, subtree: true });
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkAndReport, 150);
    };
    observer = new MutationObserver(handleMutation);
    observer.observe(observedTarget, { childList: true, subtree: true });
    checkAndReport();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(start, 800));
  } else {
    setTimeout(start, 400);
  }

  let lastUrl = location.href;
  if (!navObserver) {
    navObserver = new MutationObserver(() => {
      if (location.href === lastUrl) return;
      lastUrl       = location.href;
      lastSignature = '';
      chrome.runtime.sendMessage({ type: 'CONVERSATION_CHANGED' }, () => void chrome.runtime.lastError);
      if (!isActiveXcomPage()) return;
      setTimeout(start, 1200);
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'REQUEST_MESSAGES') checkAndReport();
});
} // end runContentScript
