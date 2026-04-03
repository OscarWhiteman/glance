import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import type { AIResponse } from '@glance/shared';
import type { StreamState } from '../hooks/useStreaming';

interface ResultViewProps {
  state: StreamState;
  tokens: string;
  result: AIResponse | null;
  error: string | null;
}

// ── Sandbox utilities ─────────────────────────────────────────────────────────

/**
 * Extracts the first ```html ... ``` block from the AI response.
 * Returns null if none found.
 */
function extractHtmlPreview(text: string): string | null {
  const match = /```html\n([\s\S]*?)```/.exec(text);
  return match ? match[1].trim() : null;
}

/**
 * Injects a strict Content-Security-Policy into the AI-generated HTML document
 * before rendering it in the sandboxed iframe. Allows only:
 *  - Tailwind CDN scripts/styles
 *  - Inline styles (needed by Tailwind)
 *  - data: and https: images
 * Blocks everything else (no fetch, no WebSockets, no frames).
 */
function injectCSP(html: string): string {
  const csp = [
    "default-src 'none'",
    "script-src 'unsafe-inline' https://cdn.tailwindcss.com",
    "style-src 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src data: https:",
    // Tailwind CDN fetches its own config at runtime; allow it, block everything else
    "connect-src https://cdn.tailwindcss.com",
  ].join('; ');

  const metaTag = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

  if (/<head[^>]*>/i.test(html)) {
    // Insert after opening <head> tag
    return html.replace(/(<head[^>]*>)/i, `$1\n  ${metaTag}`);
  }
  // No <head>: wrap the whole thing
  return `<!DOCTYPE html><html><head>${metaTag}</head><body>${html}</body></html>`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PreviewPane({ html }: { html: string }) {
  return (
    /*
     * Security model:
     *   sandbox="allow-scripts"          — lets Tailwind CDN run
     *   no allow-same-origin             — iframe gets a null origin;
     *                                      it cannot access window.glance,
     *                                      ipcRenderer, require(), or any
     *                                      Electron / Node API
     *   no allow-forms                   — no form submissions
     *   no allow-top-navigation          — no redirects
     *   no allow-popups                  — no new windows
     *   referrerpolicy="no-referrer"     — don't leak file:// URL to CDN
     */
    <iframe
      srcDoc={injectCSP(html)}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      title="Component Preview"
      className="w-full rounded-lg border border-white/10 bg-white"
      style={{ height: 'calc(100vh - 160px)', minHeight: '240px' }}
    />
  );
}

function MarkdownPane({ text, state }: { text: string; state: StreamState }) {
  return (
    <div className="space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className="prose prose-sm prose-invert max-w-none text-slate-200"
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? '');
            const isBlock = String(children).includes('\n');
            if (isBlock) {
              return (
                <CodeBlock language={match?.[1]}>
                  {String(children).trimEnd()}
                </CodeBlock>
              );
            }
            return (
              <code className="text-sky-300 bg-white/7 rounded px-1 py-0.5 text-[0.85em] font-mono">
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>

      {state === 'streaming' && (
        <span className="inline-block w-0.5 h-4 bg-sky-400 animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type ResultTab = 'response' | 'preview';

export function ResultView({ state, tokens, result, error }: ResultViewProps) {
  const [tab, setTab] = useState<ResultTab>('response');
  const text = result?.text ?? tokens;

  // Extract HTML preview block once the response is available
  const htmlPreview = useMemo(() => {
    if (!text) return null;
    return extractHtmlPreview(text);
  }, [text]);

  // ── Loading placeholder ──────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
        <div className="text-3xl opacity-40">⌘</div>
        <p className="text-sm text-slate-500">
          Press{' '}
          <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-slate-300">⌘⇧G</kbd>
          {' '}to capture a screen region.
        </p>
      </div>
    );
  }

  if (state === 'streaming' && !text) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 text-sm text-slate-400">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        Analysing…
      </div>
    );
  }

  // ── Error state with Retry ───────────────────────────────────────────────
  if (state === 'error') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 whitespace-pre-wrap">
          {error}
        </div>
        <button
          onClick={() => void window.glance.retryQuery()}
          className="no-drag flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300
                     bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          ↺ Retry
        </button>
      </div>
    );
  }

  // ── Result with optional Preview tab ────────────────────────────────────
  const showPreviewTab = state === 'done' && !!htmlPreview;

  return (
    <div className="flex flex-col gap-2">
      {/* Sub-tabs (only shown when preview is available) */}
      {showPreviewTab && (
        <div className="flex gap-1 border-b border-white/8 -mx-4 px-4">
          {(['response', 'preview'] as ResultTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`no-drag pb-1.5 text-[11px] font-medium tracking-wider uppercase transition-colors pr-3
                ${tab === t
                  ? 'text-sky-400 border-b border-sky-400 -mb-px'
                  : 'text-slate-600 hover:text-slate-400'}`}
            >
              {t === 'response' ? 'Response' : '⚡ Preview'}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {tab === 'preview' && htmlPreview ? (
        <PreviewPane html={htmlPreview} />
      ) : (
        <MarkdownPane text={text} state={state} />
      )}

      {/* Metadata footer */}
      {state === 'done' && result && (
        <div className="pt-3 mt-1 border-t border-white/8 text-[11px] text-slate-500 flex gap-2">
          <span>{result.provider}</span>
          <span>·</span>
          <span>{result.model}</span>
          <span>·</span>
          <span>{result.durationMs}ms</span>
          {showPreviewTab && tab === 'preview' && (
            <>
              <span>·</span>
              <span className="text-slate-600">sandboxed iframe</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
