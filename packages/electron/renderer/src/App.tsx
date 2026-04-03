import { useState, useCallback, useEffect } from 'react';
import { useStreaming } from './hooks/useStreaming';
import { ResultView } from './components/ResultView';
import { PermissionsGuard } from './components/PermissionsGuard';
import { HistoryView } from './components/HistoryView';
import { LogsView } from './components/LogsView';
import { SettingsView } from './components/SettingsView';
import { OnboardingView } from './components/OnboardingView';
import type { HistoryEntry, GlanceSettings } from '@glance/shared';
import type { StreamState } from './hooks/useStreaming';
import type { AIResponse } from '@glance/shared';

type Tab = 'result' | 'history' | 'logs' | 'settings';

// ── Connection indicator ───────────────────────────────────────────────────────

function ConnectionDot() {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [tip, setTip] = useState('Check API connection');

  async function check() {
    setStatus('checking');
    setTip('Checking…');
    const res = await window.glance.checkConnection();
    setStatus(res.ok ? 'ok' : 'error');
    setTip(res.ok ? 'Connected' : (res.message ?? 'Connection failed'));
    setTimeout(() => { setStatus('idle'); setTip('Check API connection'); }, 5000);
  }

  const colors: Record<typeof status, string> = {
    idle:     'bg-slate-600',
    checking: 'bg-yellow-400 animate-pulse',
    ok:       'bg-green-400',
    error:    'bg-red-400',
  };

  return (
    <button onClick={check} title={tip} className="no-drag flex items-center">
      <span className={`block w-2 h-2 rounded-full transition-all ${colors[status]}`} />
    </button>
  );
}

// ── Update banner ─────────────────────────────────────────────────────────────

function UpdateBanner({ version, onInstall }: { version: string; onInstall: () => void }) {
  return (
    <div className="px-3 py-1.5 bg-sky-500/15 border-b border-sky-500/20 flex items-center justify-between flex-shrink-0">
      <span className="text-[11px] text-sky-300">v{version} ready to install</span>
      <button
        onClick={onInstall}
        className="no-drag text-[11px] font-medium text-sky-400 hover:text-sky-300"
      >
        Restart &amp; Update ↺
      </button>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export function App() {
  const { state, tokens, result, error } = useStreaming();
  const [pinned, setPinned] = useState(true);
  const [tab, setTab] = useState<Tab>('result');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null); // null = loading
  const [initialSettings, setInitialSettings] = useState<GlanceSettings | null>(null);
  const [toast, setToast] = useState<{ type: 'warn' | 'info'; text: string } | null>(null);

  // Check if onboarding is needed (no API key or no screen recording permission)
  useEffect(() => {
    Promise.all([
      window.glance.getSettings(),
      window.glance.hasScreenRecording(),
    ]).then(([s, hasPermission]) => {
      setInitialSettings(s);
      setNeedsOnboarding(!s.provider.apiKey || !hasPermission);
    });
  }, []);

  // Override result (when loading a history entry)
  const [overrideResult, setOverrideResult] = useState<{
    state: StreamState;
    tokens: string;
    result: AIResponse | null;
    error: string | null;
  } | null>(null);

  // Live stream resets the override
  if (state === 'streaming' && overrideResult) setOverrideResult(null);

  const displayState  = overrideResult && state === 'idle' ? overrideResult.state  : state;
  const displayTokens = overrideResult && state === 'idle' ? overrideResult.tokens : tokens;
  const displayResult = overrideResult && state === 'idle' ? overrideResult.result : result;
  const displayError  = overrideResult && state === 'idle' ? overrideResult.error  : error;

  const handleLoadEntry = useCallback((entry: HistoryEntry) => {
    setOverrideResult({
      state: 'done',
      tokens: entry.responseText,
      result: {
        text: entry.responseText,
        provider: entry.provider as 'openai' | 'anthropic' | 'gemini',
        model: entry.model,
        durationMs: entry.durationMs,
      },
      error: null,
    });
    setTab('result');
  }, []);

  // Listen for status events from main process
  useEffect(() => {
    return window.glance.onStatus((s) => {
      if (s.type === 'update-ready' && s.text) {
        const m = s.text.match(/v([\d.]+)/);
        if (m) setUpdateVersion(m[1]);
      } else if (s.type === 'hotkey-conflict' && s.text) {
        setToast({ type: 'warn', text: s.text });
      }
    });
  }, []);

  // Tray "Settings" menu opens the settings tab
  useEffect(() => {
    return window.glance.onShowSettings(() => setTab('settings'));
  }, []);

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    window.glance.setAlwaysOnTop(next);
  }

  // Show nothing until we know whether onboarding is needed
  if (needsOnboarding === null) return null;

  // Show onboarding wizard if no API key is configured
  if (needsOnboarding) {
    return (
      <div className="h-screen flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#1a1a2e] select-text">
        <header className="drag flex items-center justify-between px-3 py-2 border-b border-white/8 flex-shrink-0">
          <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Glance</span>
          <button onClick={() => window.glance.hideWindow()}
            className="no-drag p-1.5 rounded text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors text-sm leading-none">✕</button>
        </header>
        <main className="no-drag flex-1 overflow-y-auto px-4 py-3 min-h-0">
          <OnboardingView
            initialSettings={initialSettings!}
            onComplete={() => setNeedsOnboarding(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col rounded-xl overflow-hidden border border-white/10 bg-[#1a1a2e] select-text">

      {/* ── Update banner (shown when a downloaded update is ready) ── */}
      {updateVersion && (
        <UpdateBanner
          version={updateVersion}
          onInstall={() => void window.glance.installUpdate()}
        />
      )}

      {/* ── Toast notification (hotkey conflict, etc.) ── */}
      {toast && (
        <div className={`px-3 py-1.5 flex items-center justify-between flex-shrink-0 border-b ${
          toast.type === 'warn'
            ? 'bg-amber-500/15 border-amber-500/20'
            : 'bg-sky-500/15 border-sky-500/20'
        }`}>
          <span className={`text-[11px] ${
            toast.type === 'warn' ? 'text-amber-300' : 'text-sky-300'
          }`}>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            className="no-drag text-[11px] text-slate-500 hover:text-slate-300 ml-2 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="drag flex items-center justify-between px-3 py-2 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">Glance</span>
          <ConnectionDot />
          {state === 'streaming' && (
            <span className="flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i}
                  className="w-1 h-1 rounded-full bg-sky-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
        </div>
        <div className="no-drag flex items-center gap-1">
          <button
            onClick={() => setTab(tab === 'settings' ? 'result' : 'settings')}
            title="Settings"
            className={`p-1.5 rounded text-sm transition-colors ${
              tab === 'settings'
                ? 'text-sky-400 hover:bg-sky-400/10'
                : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
            }`}>⚙</button>
          <button onClick={togglePin}
            title={pinned ? 'Unpin' : 'Pin (always on top)'}
            className={`p-1.5 rounded text-sm transition-colors ${
              pinned
                ? 'text-sky-400 hover:bg-sky-400/10'
                : 'text-slate-600 hover:text-slate-400 hover:bg-white/5'
            }`}>📌</button>
          <button onClick={() => window.glance.hideWindow()}
            className="p-1.5 rounded text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors text-sm leading-none">✕</button>
        </div>
      </header>

      {/* ── Tabs (hidden when settings is active) ── */}
      {tab !== 'settings' && (
        <div className="drag flex border-b border-white/8 flex-shrink-0">
          {(['result', 'history', 'logs'] as Tab[]).map((t) => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`no-drag flex-1 py-1.5 text-[11px] font-medium tracking-wider uppercase transition-colors
                ${tab === t
                  ? 'text-sky-400 border-b border-sky-400 -mb-px'
                  : 'text-slate-600 hover:text-slate-400'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <main className="no-drag flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {tab === 'settings' ? (
          <SettingsView onDone={() => setTab('result')} />
        ) : tab === 'logs' ? (
          <LogsView />
        ) : tab === 'history' ? (
          <HistoryView onLoadEntry={handleLoadEntry} />
        ) : state === 'permissions' ? (
          <PermissionsGuard />
        ) : (
          <ResultView
            state={displayState}
            tokens={displayTokens}
            result={displayResult}
            error={displayError}
          />
        )}
      </main>
    </div>
  );
}
