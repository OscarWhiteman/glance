/**
 * Glance — content script
 *
 * Tracks the last right-clicked element and responds to capture requests
 * from the background service worker.
 *
 * Written as a plain script (no imports) so it compiles to a classic JS
 * file that Chrome can load as a content script without module support.
 */

// ── State ─────────────────────────────────────────────────────────────────────

let lastTarget: Element | null = null;

// Track the element the user right-clicked on
document.addEventListener('contextmenu', (e: MouseEvent) => {
  lastTarget = e.target as Element;
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; selectionText: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: { text: string; html: string; url: string; selectionText: string } | null) => void,
  ) => {
    if (message.type !== 'GLANCE_CAPTURE') return;

    const selection = window.getSelection()?.toString().trim() ?? '';

    let html = '';
    let text = '';

    if (selection) {
      // User has text selected — prefer that
      text = selection.slice(0, 8000);
      html = '';
    } else if (lastTarget) {
      // Capture the right-clicked element
      const el = lastTarget as HTMLElement;

      // Grab visible text (much cheaper to transmit than raw HTML)
      text = (el.innerText ?? el.textContent ?? '').trim().slice(0, 8000);

      // Include a stripped HTML snapshot (no inline scripts / styles)
      try {
        const clone = el.cloneNode(true) as HTMLElement;
        // Remove script and style tags from clone
        clone.querySelectorAll('script, style, svg').forEach((n) => n.remove());
        html = clone.outerHTML.slice(0, 20_000);
      } catch {
        html = '';
      }
    } else {
      // Fallback: capture visible body text
      text = document.body.innerText.trim().slice(0, 8000);
    }

    sendResponse({
      text,
      html,
      url: window.location.href,
      selectionText: message.selectionText,
    });

    return true; // keep message channel open
  },
);
