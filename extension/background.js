// ── Side panel opener ─────────────────────────────────────
// Store the tab id in session storage so the sidepanel can ask us to relay
// REQUEST_MESSAGES without needing the broad "tabs" permission itself.
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.storage.session.set({ activeTabId: tab.id });
});

// ── Programmatic injection for x.com/grok ────────────────
// x.com is Twitter/X — we must NOT inject on the whole domain.
// content_scripts.matches therefore excludes x.com entirely.
// Instead we watch for navigation to the /grok or /i/grok paths
// and inject only then, so reviewers can see we never touch non-Grok pages.
//
// Guard against double-injection: content.js checks window.__aiTrackerLoaded
// at startup and exits immediately if already set.

const GROK_PATH_RE = /^\/(i\/grok|grok)(\/|$)/;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page has finished loading (avoids double-fire on
  // 'loading' + 'complete' for the same navigation).
  if (changeInfo.status !== 'complete') return;

  // Only x.com tabs.
  if (!tab.url || !tab.url.startsWith('https://x.com/')) return;

  // Only /grok or /i/grok paths.
  let path;
  try { path = new URL(tab.url).pathname; } catch { return; }
  if (!GROK_PATH_RE.test(path)) return;

  // Inject content.js into this specific tab.
  // chrome.scripting is available to background workers without "tabs".
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
  }).catch(() => {
    // Tab may have navigated away between the event and the inject — ignore.
  });
});

// ── Message relay ─────────────────────────────────────────
// The sidepanel sends REQUEST_MESSAGES_FROM_ACTIVE_TAB; we forward it to the
// content script using the stored tab id. The background worker is allowed to
// call chrome.tabs.sendMessage on a specific known tab without "tabs" permission.
// Per MV3 spec, chrome.tabs.sendMessage does not require the "tabs" permission
// when the tabId is already known (obtained via activeTab or stored in session).
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'REQUEST_MESSAGES_FROM_ACTIVE_TAB') return;
  chrome.storage.session.get('activeTabId', ({ activeTabId }) => {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'REQUEST_MESSAGES' },
      () => void chrome.runtime.lastError);
  });
});
