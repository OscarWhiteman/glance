/**
 * Glance — background service worker (MV3)
 *
 * Handles context-menu registration and the WebSocket bridge to the
 * Electron desktop app on ws://localhost:43210.
 *
 * Written as a plain script (no imports) so it compiles to a classic JS file
 * that works as a MV3 service worker without needing "type": "module".
 */

// ── Types (inlined — no runtime imports) ─────────────────────────────────────

interface WSMessage<T = unknown> {
  type: string;
  id: string;
  payload: T;
}

interface TextRequestPayload {
  text: string;
  html: string;
  url: string;
  prompt: string;
  source: 'extension';
}

interface CapturedContent {
  text: string;
  html: string;
  url: string;
  selectionText?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WS_URL = 'ws://localhost:43210';
const MENU_ITEM_ID = 'glance-send';

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ITEM_ID,
    title: 'Send to Glance',
    contexts: ['page', 'selection', 'image', 'link', 'editable'],
  });
});

// ── Context menu click ───────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ITEM_ID || !tab?.id) return;

  // Ask the content script to capture the right-clicked element / selection
  chrome.tabs.sendMessage(
    tab.id,
    { type: 'GLANCE_CAPTURE', selectionText: info.selectionText ?? '' },
    (response: CapturedContent | null) => {
      if (chrome.runtime.lastError || !response) {
        console.warn('[Glance] Content script did not respond:', chrome.runtime.lastError?.message);
        return;
      }
      void sendToElectron(response);
    },
  );
});

// ── WebSocket bridge ─────────────────────────────────────────────────────────

async function sendToElectron(content: CapturedContent): Promise<void> {
  let ws: WebSocket;
  try {
    ws = await openWebSocket(WS_URL);
  } catch (err) {
    console.error('[Glance] Could not connect to Electron app:', err);
    showBadge('✗', '#ef4444');
    setTimeout(() => clearBadge(), 3000);
    return;
  }

  const prompt = content.selectionText
    ? `Explain this selected text from the web page:\n\n"${content.selectionText}"`
    : 'Explain what this page content shows and what it does.';

  const msg: WSMessage<TextRequestPayload> = {
    type: 'TEXT_REQUEST',
    id: generateId(),
    payload: {
      text: content.text,
      html: content.html,
      url: content.url,
      prompt,
      source: 'extension',
    },
  };

  ws.send(JSON.stringify(msg));
  showBadge('…', '#38bdf8');

  ws.onmessage = (event: MessageEvent) => {
    try {
      const reply = JSON.parse(event.data as string) as WSMessage;
      if (reply.type === 'ACK') {
        showBadge('✓', '#22c55e');
        setTimeout(() => clearBadge(), 2000);
      }
    } catch { /* ignore */ }
    ws.close();
  };

  // Close after 10s regardless
  setTimeout(() => { if (ws.readyState !== WebSocket.CLOSED) ws.close(); }, 10_000);
}

function openWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    ws.onopen = () => { clearTimeout(timer); resolve(ws); };
    ws.onerror = () => { clearTimeout(timer); reject(new Error('WebSocket connection error')); };
  });
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

function showBadge(text: string, color: string): void {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

function clearBadge(): void {
  chrome.action.setBadgeText({ text: '' });
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
